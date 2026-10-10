import { NUM_BANDS, binRanges } from "./bands.js";
import { makeSpectrumAnalyser } from "./fft.js";
import { frameRmsDb, detectGate, numFramesFor } from "./gate.js";
import { erbBinRanges, accumulateErb, NUM_ERB } from "./metrics.js";
import { integratedLoudness, samplePeakDb, framePeaksDb } from "./loudness.js";
import { mixToMono } from "./mono.js";

export const DB_FLOOR = -120;

// Long-term band spectrum of a mono stem, averaged over active frames only,
// plus the activity gate.
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
  const erbRanges = erbBinRanges(sampleRate, nfft);
  const erbEnergies = new Float32Array(numFrames * NUM_ERB);
  const power = new Float64Array(nfft / 2 + 1);
  const acc = new Float64Array(NUM_BANDS);
  let activeFrames = 0;

  for (let f = 0; f < numFrames; f++) {
    analyser.powerSpectrumInto(mono, f * hop, power);
    accumulateErb(power, erbRanges, erbEnergies, f * NUM_ERB);
    if (gate.active[f]) {
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

  // Long-term ERB spectrum over active frames (power mean), for the overlay.
  const erbMeanDb = new Float64Array(NUM_ERB).fill(DB_FLOOR);
  if (activeFrames > 0) {
    const acc = new Float64Array(NUM_ERB);
    for (let f = 0; f < numFrames; f++) {
      if (!gate.active[f]) continue;
      for (let b = 0; b < NUM_ERB; b++) acc[b] += erbEnergies[f * NUM_ERB + b];
    }
    for (let b = 0; b < NUM_ERB; b++) erbMeanDb[b] = acc[b] > 0 ? Math.max(DB_FLOOR, 10 * Math.log10(acc[b] / activeFrames)) : DB_FLOOR;
  }

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
    frameRmsDb: rms,
    active: gate.active,
    erb: { numBands: NUM_ERB, energies: erbEnergies, meanDb: erbMeanDb },
    gate: {
      transitions: gate.transitions,
      activeFraction: gate.activeFraction,
      thresholdDb: gateDb,
    },
    empty,
  };
}

// Full per-stem measurement from the channel arrays: the analysis on the
// mono mix plus BS.1770 loudness and peaks per channel. Used by the worker
// and the CLI so both agree.
export function analyzeChannels(channels, sampleRate, opts = {}, onProgress) {
  const mono = mixToMono(channels);
  const analysis = analyzeStem(mono, sampleRate, opts, onProgress);
  const { lufs } = integratedLoudness(channels, sampleRate);
  analysis.lufs = lufs;
  analysis.samplePeakDb = samplePeakDb(channels);
  analysis.framePeaksDb = framePeaksDb(channels, analysis.nfft, analysis.hop);
  return analysis;
}
