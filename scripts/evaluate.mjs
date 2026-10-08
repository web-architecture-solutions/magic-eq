// Objective evaluation of the model on a set of stems.
//
//   node scripts/evaluate.mjs <wav files or dirs...> [--presets a,b,c] [--limit N]
//        [--balance lufs|rms|none] [--rendered <dir>] [--json <out>] [--md]
//
// --balance lufs (default) is the app's Balance: equal BS.1770 loudness plus
// role offsets guessed from file names, anchored so nothing is boosted.
// --balance rms equalises RMS over active frames; none keeps raw tracking
// levels, which leave the quiet stems buried whatever the EQ does.
//
// Scores each preset with the ERB signal-to-masker metric (src/dsp/metrics.js)
// before and after the derived cuts. With --rendered, also scores the real
// rendered stems found in <dir> as <name>.eq.wav (from this tool's export, or
// any other tool's output on the same stems).
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { decodeWavPcm } from "../src/dsp/wav.js";
import { mixToMono } from "../src/dsp/mono.js";
import { analyzeChannels } from "../src/dsp/analyze.js";
import { balanceLoudness, anchorFaders } from "../src/dsp/balance.js";
import { guessRole, DEFAULT_ROLE_OFFSETS } from "../src/dsp/roles.js";
import { deriveCurves, knobDefaults, perTrackDefaults } from "../src/dsp/model.js";
import { evaluateCurves, erbFrameEnergies, smrReport } from "../src/dsp/metrics.js";

export const PRESETS = {
  bypass: { carveDb: 0, levelDb: 0, scoopDb: 0 },
  defaults: {},
  carve3: { carveDb: 3, levelDb: 0, scoopDb: 0 },
  carve6: { carveDb: 6, levelDb: 0, scoopDb: 0 },
  scoop3: { carveDb: 0, levelDb: 0, scoopDb: 3 },
  flatten3: { carveDb: 0, levelDb: 3, scoopDb: 0 },
  shape: { carveDb: 3, levelDb: 3, scoopDb: 3 },
  psycho3: { carveDb: 3, levelDb: 0, scoopDb: 0, psycho: true },
  psycho6: { carveDb: 6, levelDb: 0, scoopDb: 0, psycho: true },
  sum3: { carveDb: 3, levelDb: 0, scoopDb: 0, crossNorm: "sum" },
  mean3: { carveDb: 3, levelDb: 0, scoopDb: 0, crossNorm: "mean" },
};

function parseArgs(argv) {
  const opts = { inputs: [], presets: Object.keys(PRESETS), limit: Infinity, postFader: false, balance: "lufs", rendered: null, json: null, md: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--presets") opts.presets = argv[++i].split(",");
    else if (a === "--limit") opts.limit = parseInt(argv[++i], 10);
    else if (a === "--balance") opts.balance = argv[++i];
    else if (a === "--rendered") opts.rendered = argv[++i];
    else if (a === "--json") opts.json = argv[++i];
    else if (a === "--md") opts.md = true;
    else opts.inputs.push(a);
  }
  return opts;
}

function listWavs(inputs) {
  const out = [];
  for (const p of inputs) {
    if (statSync(p).isDirectory()) {
      for (const f of readdirSync(p).sort()) {
        const q = join(p, f);
        if (statSync(q).isDirectory()) out.push(...listWavs([q]));
        else if (extname(f).toLowerCase() === ".wav" && !f.startsWith("._")) out.push(q);
      }
    } else out.push(p);
  }
  return out;
}

export function loadStem(path) {
  const buf = readFileSync(path);
  const pcm = decodeWavPcm(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  return { name: basename(path), sampleRate: pcm.sampleRate, channels: pcm.channels, mono: mixToMono(pcm.channels) };
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const db = (x) => `${x >= 0 ? "+" : ""}${x.toFixed(2)} dB`;

export function activeRmsDb(mono, analysis) {
  const { hop, nfft, active } = analysis;
  let acc = 0;
  let n = 0;
  for (let f = 0; f < active.length; f++) {
    if (!active[f]) continue;
    const start = f * hop;
    for (let i = start; i < start + nfft && i < mono.length; i++) {
      acc += mono[i] * mono[i];
      n++;
    }
  }
  return n > 0 && acc > 0 ? 10 * Math.log10(acc / n) : -120;
}

export function balanceFaders(stems, analyses, mode, targetDb = -20) {
  if (mode === "lufs") {
    const auto = balanceLoudness(analyses.map((a, i) => ({ lufs: a.lufs, role: guessRole(stems[i].name) })), { targetLufs: -23, offsets: DEFAULT_ROLE_OFFSETS });
    return anchorFaders(auto).faders;
  }
  if (mode !== "rms") return stems.map(() => 0);
  return stems.map((s, i) => targetDb - activeRmsDb(s.mono, analyses[i]));
}

export function evaluateSet(stems, { presets, balance = "lufs" }) {
  const analyses = stems.map((s) => analyzeChannels(s.channels, s.sampleRate));
  const faders = balanceFaders(stems, analyses, balance);
  const rows = [];
  for (const name of presets) {
    const knobs = knobDefaults({ ...PRESETS[name], postFader: false });
    const curves = deriveCurves(analyses, faders, analyses.map(() => perTrackDefaults()), knobs);
    const { before, after } = evaluateCurves(analyses, curves);
    const effect = curves.effect.reduce((a, b) => a + b, 0) / curves.effect.length;
    const makeup = curves.makeupDb.reduce((a, b) => a + b, 0) / curves.makeupDb.length;
    rows.push({
      preset: name,
      maskedBefore: before.total.maskedFraction,
      maskedAfter: after.total.maskedFraction,
      smrBefore: before.total.meanSmrDb,
      smrAfter: after.total.meanSmrDb,
      overlapDb: curves.masking.ratioDb,
      effect,
      makeup,
      perStem: after.stems.map((r, i) => ({ name: stems[i].name, maskedBefore: before.stems[i].maskedFraction, maskedAfter: r.maskedFraction, smrBefore: before.stems[i].meanSmrDb, smrAfter: r.meanSmrDb, effect: curves.effect[i] })),
    });
  }
  return { analyses, rows, faders };
}

export function scoreRendered(stems, analyses, dir, faders) {
  const items = [];
  for (let i = 0; i < stems.length; i++) {
    const base = stems[i].name.replace(/\.[^.]+$/, "");
    const path = join(dir, `${base}.eq.wav`);
    if (!existsSync(path)) return null;
    const r = loadStem(path);
    const { energies, numFrames } = erbFrameEnergies(r.mono, r.sampleRate);
    items.push({ energies, numFrames, active: analyses[i].active, faderDb: faders[i], makeupDb: 0, gains16: null });
  }
  return smrReport(items);
}

function table(rows, md) {
  const head = ["preset", "masked before", "masked after", "Δ masked", "SMR before", "SMR after", "Δ SMR", "overlap", "effect", "make-up"];
  const lines = rows.map((r) => [r.preset, pct(r.maskedBefore), pct(r.maskedAfter), `${((r.maskedAfter - r.maskedBefore) * 100).toFixed(1)} pt`, db(r.smrBefore), db(r.smrAfter), db(r.smrAfter - r.smrBefore), db(r.overlapDb), `${r.effect.toFixed(1)} dB`, `${r.makeup.toFixed(1)} dB`]);
  if (md) return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...lines.map((l) => `| ${l.join(" | ")} |`)].join("\n");
  const widths = head.map((h, c) => Math.max(h.length, ...lines.map((l) => l[c].length)));
  const fmt = (l) => l.map((v, c) => v.padEnd(widths[c])).join("  ");
  return [fmt(head), ...lines.map(fmt)].join("\n");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const files = listWavs(opts.inputs).slice(0, opts.limit);
  if (files.length < 2) {
    console.error("need at least two WAV stems");
    process.exit(1);
  }
  const t0 = Date.now();
  const stems = files.map(loadStem);
  console.error(`loaded ${stems.length} stems in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const { analyses, rows, faders } = evaluateSet(stems, opts);
  console.error(`balance ${opts.balance}: faders ${faders.map((f) => f.toFixed(1)).join(", ")} dB`);
  if (opts.balance === "lufs") console.error(`roles: ${stems.map((s, i) => `${s.name.replace(/\.[^.]+$/, "")}=${guessRole(s.name)} (${analyses[i].lufs.toFixed(1)} LUFS)`).join(", ")}`);
  console.error(`analysed and scored ${opts.presets.length} presets in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(table(rows, opts.md));
  const ref = rows.find((r) => r.preset === "defaults") || rows[0];
  console.log(opts.md ? "\n| stem | masked before | masked after | SMR before | SMR after | effect |\n| --- | --- | --- | --- | --- | --- |" : `\nper stem (${ref.preset}):`);
  for (const s of ref.perStem) {
    const cells = [s.name, pct(s.maskedBefore), pct(s.maskedAfter), db(s.smrBefore), db(s.smrAfter), `${s.effect.toFixed(1)} dB`];
    console.log(opts.md ? `| ${cells.join(" | ")} |` : `  ${cells.map((c) => c.padEnd(16)).join("")}`);
  }
  if (opts.rendered) {
    const r = scoreRendered(stems, analyses, opts.rendered, faders);
    if (!r) console.log(`\nrendered: missing <name>.eq.wav for some stems in ${opts.rendered}`);
    else console.log(`\nrendered stems in ${opts.rendered}: masked ${pct(r.total.maskedFraction)}, mean SMR ${db(r.total.meanSmrDb)}`);
  }
  if (opts.json) writeFileSync(opts.json, JSON.stringify({ files, rows }, null, 1));
}

if (process.argv[1] && process.argv[1].endsWith("evaluate.mjs")) main();
