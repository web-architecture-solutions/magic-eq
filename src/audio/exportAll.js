import { renderStem, renderMix, rmsDbOfBuffer } from "./render.js";
import { encodeWav24 } from "../dsp/wav.js";
import { buildRecipe } from "../dsp/recipe.js";
import { dbToGain } from "./context.js";
import { monoFromBuffer } from "./decode.js";
import { erbFrameEnergies, smrReport } from "../dsp/metrics.js";

const TRIM_TARGET = Math.pow(10, -1 / 20); // -1 dBFS

function channelsOf(buffer, scale = 1) {
  const out = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = new Float32Array(buffer.length);
    buffer.copyFromChannel(ch, c);
    if (scale !== 1) for (let i = 0; i < ch.length; i++) ch[i] *= scale;
    out.push(ch);
  }
  return out;
}

function baseName(name) {
  return name.replace(/\.[^.]+$/, "");
}

// Renders every stem and the mix, encodes 24-bit WAVs, and builds the recipe.
// specs[i] = { faderDb, makeupDb, gains, q, hpfHz }.
export async function exportAll({ stems, specs, curves, knobs, sampleRate, trimMix = true, evaluate = true, masterTrimDb = 0, onProgress }) {
  const files = [];
  const measuredMakeupDb = [];
  const processed = [];
  const renderedErb = [];
  const total = stems.length + 2 + (evaluate ? 1 : 0);
  let done = 0;
  const report = (label) => onProgress?.({ done, total, label });

  for (let i = 0; i < stems.length; i++) {
    const s = stems[i];
    report(`Rendering ${s.name}`);
    // Render without the fader so the stem comes back at its source level;
    // the mix below applies faders.
    const spec = { ...specs[i], faderDb: 0 };
    const rendered = await renderStem(s.buffer, spec);
    const before = rmsDbOfBuffer(s.buffer);
    const after = rmsDbOfBuffer(rendered);
    const residual = knobs.litMakeup && Number.isFinite(before) && Number.isFinite(after) ? before - after : 0;
    measuredMakeupDb.push((specs[i].makeupDb || 0) + residual);
    const chans = channelsOf(rendered, dbToGain(residual));
    if (evaluate) {
      report(`Scoring ${s.name}`);
      await new Promise((r) => setTimeout(r, 0));
      const mono = chans.length === 1 ? chans[0] : monoFromBuffer(rendered);
      if (chans.length !== 1) for (let k = 0; k < mono.length; k++) mono[k] *= dbToGain(residual);
      renderedErb.push(erbFrameEnergies(mono, rendered.sampleRate, { nfft: s.analysis?.nfft, hop: s.analysis?.hop }));
    }
    const { arrayBuffer, clippedSamples } = encodeWav24(chans, rendered.sampleRate);
    files.push({
      name: `${baseName(s.name)}.eq.wav`,
      blob: new Blob([arrayBuffer], { type: "audio/wav" }),
      clippedSamples,
      kind: "stem",
    });
    processed.push({ stem: s, residual });
    done++;
    report();
  }

  report("Rendering mix");
  const mixSpecs = specs.map((sp, i) => ({ ...sp, makeupDb: (sp.makeupDb || 0) + processed[i].residual }));
  const mix = await renderMix(stems, mixSpecs, sampleRate);
  const mixChans = channelsOf(mix, dbToGain(masterTrimDb || 0));
  let mixPeak = 0;
  for (const ch of mixChans) for (let i = 0; i < ch.length; i++) mixPeak = Math.max(mixPeak, Math.abs(ch[i]));
  let mixTrimDb = 0;
  if (trimMix && mixPeak > TRIM_TARGET) {
    mixTrimDb = 20 * Math.log10(TRIM_TARGET / mixPeak);
    const g = TRIM_TARGET / mixPeak;
    for (const ch of mixChans) for (let i = 0; i < ch.length; i++) ch[i] *= g;
  }
  const mixEnc = encodeWav24(mixChans, mix.sampleRate);
  files.push({
    name: "mix.eq.wav",
    blob: new Blob([mixEnc.arrayBuffer], { type: "audio/wav" }),
    clippedSamples: mixEnc.clippedSamples,
    trimDb: mixTrimDb,
    kind: "mix",
  });
  done++;
  report();

  let evaluation = null;
  if (evaluate) {
    report("Scoring the session");
    await new Promise((r) => setTimeout(r, 0));
    const before = smrReport(stems.map((s, i) => ({ energies: s.analysis.erb.energies, numFrames: s.analysis.numFrames, active: s.analysis.active, faderDb: curves.faders[i], makeupDb: 0, gains16: null })));
    const after = smrReport(stems.map((s, i) => ({ energies: renderedErb[i].energies, numFrames: renderedErb[i].numFrames, active: s.analysis.active, faderDb: curves.faders[i], makeupDb: 0, gains16: null })));
    evaluation = {
      total: { maskedBefore: before.total.maskedFraction, maskedAfter: after.total.maskedFraction, smrBefore: before.total.meanSmrDb, smrAfter: after.total.meanSmrDb },
      stems: stems.map((s, i) => ({ name: s.name, maskedBefore: before.stems[i].maskedFraction, maskedAfter: after.stems[i].maskedFraction, smrBefore: before.stems[i].meanSmrDb, smrAfter: after.stems[i].meanSmrDb })),
      thresholdDb: before.thresholdDb,
    };
    done++;
    report();
  }

  const recipe = buildRecipe({ stems, curves, knobs, sampleRate, measuredMakeupDb, masterTrimDb });
  if (evaluation) recipe.evaluation = evaluation;
  files.push({
    name: "recipe.json",
    blob: new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" }),
    clippedSamples: 0,
    kind: "recipe",
  });
  done++;
  report("Done");
  return { files, recipe, evaluation };
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function downloadAll(files) {
  for (const f of files) {
    downloadBlob(f.blob, f.name);
    await new Promise((r) => setTimeout(r, 300));
  }
}
