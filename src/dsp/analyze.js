import { NUM_BANDS, binRanges } from "./bands.js";
import { makeSpectrumAnalyser } from "./fft.js";
import { frameRmsDb, detectGate, numFramesFor } from "./gate.js";
import { modeEnvelope } from "./envelope.js";

export const DB_FLOOR = -120;

// Long-term band spectrum of a mono stem, averaged over active frames only,
// plus the activity gate and the mode envelope.
//
// Calibration: a full-scale sine reads 0 dB in its band (bandMode 'sum').
export function analyzeStem(mono, sampleRate, opts = {}, onProgress) {
  const {
    nfft = 4096,
    hop = 2048,
    gateDb = -50,
    hysteresisDb = 6,
    holdSec = 0.25,
    bandMode = "sum",
    progressEvery = 100,
  } = opts;

  const numFrames = numFramesFor(mono.length, nfft, hop);
  const frameRate = sampleRate / hop;
  const rms = frameRmsDb(mono, nfft, hop);
  const gate = detectGate(rms, {
    thresholdDb: gateDb,
    hysteresisDb,
    holdSec,
    frameRate,
  });

  const analyser = makeSpectrumAnalyser(nfft);
  const ranges = binRanges(sampleRate, nfft);
  const power = new Float64Array(nfft / 2 + 1);
  const acc = new Float64Array(NUM_BANDS);
  let activeFrames = 0;

  for (let f = 0; f < numFrames; f++) {
    if (gate.active[f]) {
      analyser.powerSpectrumInto(mono, f * hop, power);
      for (let b = 0; b < NUM_BANDS; b++) {
        const r = ranges[b];
        if (r.empty) continue;
        let s = 0;
        for (let k = r.lo; k <= r.hi; k++) s += power[k];
        acc[b] += bandMode === "mean" ? s / (r.hi - r.lo + 1) : s;
      }
      activeFrames++;
    }
    if (onProgress && f % progressEvery === 0) onProgress(f / numFrames);
  }

  const bandPower = new Float64Array(NUM_BANDS);
  const bandDb = new Float64Array(NUM_BANDS);
  let peakDb = -Infinity;
  for (let b = 0; b < NUM_BANDS; b++) {
    bandPower[b] = activeFrames > 0 ? acc[b] / activeFrames : 0;
    bandDb[b] =
      bandPower[b] > 0
        ? Math.max(DB_FLOOR, 10 * Math.log10(bandPower[b]))
        : DB_FLOOR;
    if (bandDb[b] > peakDb) peakDb = bandDb[b];
  }
  const empty = activeFrames === 0;
  if (empty) peakDb = DB_FLOOR;

  const S = new Float64Array(NUM_BANDS);
  for (let b = 0; b < NUM_BANDS; b++) S[b] = bandDb[b] - peakDb;
  const E = modeEnvelope(S);

  if (onProgress) onProgress(1);

  return {
    sampleRate,
    nfft,
    hop,
    numFrames,
    durationSec: mono.length / sampleRate,
    bandPower,
    bandDb,
    peakDb,
    S,
    E,
    frameRmsDb: rms,
    gate: {
      transitions: gate.transitions,
      activeFraction: gate.activeFraction,
      thresholdDb: gateDb,
    },
    empty,
  };
}
