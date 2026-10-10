// Objective masking metric: an excitation-pattern signal-to-masker ratio in
// ERB bands with a spreading function, in the spirit of Vega & Janer (2010)
// and the masking measures used by Hafezi & Reiss (2015). Maskee = one stem,
// masker = the power sum of all the others at mix level, spread across
// neighbouring bands. Pure functions over typed arrays; no DOM, no Web Audio.

import { makeSpectrumAnalyser } from "./fft.js";
import { bandIndexOf } from "./bands.js";

export const ERB_LO_HZ = 20;
export const ERB_HI_HZ = 20000;

export function erbRate(f) {
  return 21.4 * Math.log10(1 + 0.00437 * f);
}

export function erbToHz(e) {
  return (Math.pow(10, e / 21.4) - 1) / 0.00437;
}

let edgesCache = null;

// One-ERB-wide bands from 20 Hz to 20 kHz (41 bands).
export function erbEdges() {
  if (!edgesCache) {
    const e0 = erbRate(ERB_LO_HZ);
    const e1 = erbRate(ERB_HI_HZ);
    const n = Math.ceil(e1 - e0);
    edgesCache = new Float64Array(n + 1);
    for (let k = 0; k <= n; k++) edgesCache[k] = Math.min(ERB_HI_HZ, erbToHz(e0 + k));
  }
  return edgesCache;
}

export function erbCentres() {
  const e = erbEdges();
  const c = new Float64Array(e.length - 1);
  for (let b = 0; b < c.length; b++) c[b] = Math.sqrt(e[b] * e[b + 1]);
  return c;
}

export const NUM_ERB = erbEdges().length - 1;

export function erbBinRanges(sampleRate, nfft) {
  const e = erbEdges();
  const nyq = nfft / 2;
  const out = [];
  for (let b = 0; b < NUM_ERB; b++) {
    let lo = Math.ceil((e[b] * nfft) / sampleRate);
    let hi = Math.ceil((e[b + 1] * nfft) / sampleRate) - 1;
    if (hi > nyq) hi = nyq;
    if (lo > nyq) lo = nyq + 1;
    if (hi < lo) hi = lo; // very narrow low bands still own at least one bin
    out.push({ lo, hi, empty: lo > nyq });
  }
  return out;
}

// Schroeder spreading function (dB) for a distance dz in Bark; 1 ERB is taken
// as ~0.7 Bark. Normalised so the masker's own band is 0 dB. Upward
// (masker below maskee) decays ~10 dB/Bark, downward ~25 dB/Bark.
const BARK_PER_ERB = 0.7;
export const SPREAD_MIN = -8;
export const SPREAD_MAX = 16;
let kernelCache = null;

export function spreadKernel() {
  if (!kernelCache) {
    kernelCache = new Float64Array(SPREAD_MAX - SPREAD_MIN + 1);
    const s = (dz) => 15.81 + 7.5 * (dz + 0.474) - 17.5 * Math.sqrt(1 + (dz + 0.474) ** 2);
    const s0 = s(0);
    for (let d = SPREAD_MIN; d <= SPREAD_MAX; d++) {
      kernelCache[d - SPREAD_MIN] = Math.pow(10, (s(d * BARK_PER_ERB) - s0) / 10);
    }
  }
  return kernelCache;
}

// Per-frame ERB band energies (peak-amplitude calibrated like analyzeStem),
// row-major [frame * NUM_ERB + band]. Frames follow the same nfft/hop as the
// analysis so the two line up.
export function erbFrameEnergies(mono, sampleRate, { nfft = 4096, hop = 2048 } = {}) {
  const analyser = makeSpectrumAnalyser(nfft);
  const ranges = erbBinRanges(sampleRate, nfft);
  const numFrames = mono.length <= nfft ? 1 : Math.floor((mono.length - nfft) / hop) + 1;
  const out = new Float32Array(numFrames * NUM_ERB);
  const power = new Float64Array(nfft / 2 + 1);
  for (let f = 0; f < numFrames; f++) {
    analyser.powerSpectrumInto(mono, f * hop, power);
    accumulateErb(power, ranges, out, f * NUM_ERB);
  }
  return { energies: out, numFrames };
}

export function accumulateErb(power, ranges, out, offset) {
  for (let b = 0; b < NUM_ERB; b++) {
    const r = ranges[b];
    if (r.empty) continue;
    let s = 0;
    for (let k = r.lo; k <= r.hi; k++) s += power[k];
    out[offset + b] = s;
  }
}

// Map a 16-band gain curve (dB) onto the ERB bands by centre frequency.
export function erbGainsFrom16(gains16) {
  const c = erbCentres();
  const out = new Float64Array(NUM_ERB);
  if (!gains16) return out;
  for (let b = 0; b < NUM_ERB; b++) {
    const i = bandIndexOf(c[b]);
    out[b] = i >= 0 ? gains16[i] : 0;
  }
  return out;
}

// stems: [{ energies, numFrames, active (Uint8Array per frame, optional),
//           faderDb, makeupDb, gains16 (dB per 16-band, or null),
//           erbGainsDb (exact chain response per ERB band; wins over gains16) }]
// Returns per-stem masked fraction and mean SMR over the stem's own cells,
// plus an energy-weighted session total.
export function smrReport(stems, { thresholdDb = -6, ownRangeDb = 30, spread = true } = {}) {
  const N = stems.length;
  const T = Math.max(...stems.map((s) => s.numFrames));
  const B = NUM_ERB;
  const scaled = stems.map((s) => {
    const g = s.erbGainsDb ?? erbGainsFrom16(s.gains16);
    const base = ((s.faderDb || 0) + (s.makeupDb || 0)) / 10;
    const lin = new Float64Array(B);
    for (let b = 0; b < B; b++) lin[b] = Math.pow(10, base + g[b] / 10);
    const out = new Float32Array(T * B);
    for (let t = 0; t < s.numFrames; t++) {
      for (let b = 0; b < B; b++) out[t * B + b] = s.energies[t * B + b] * lin[b];
    }
    return out;
  });
  const total = new Float64Array(T * B);
  for (const p of scaled) for (let i = 0; i < total.length; i++) total[i] += p[i];

  const kernel = spreadKernel();
  const ownFloor = Math.pow(10, -ownRangeDb / 10);
  const thr = thresholdDb;
  const masker = new Float64Array(B);
  const spreadM = new Float64Array(B);
  const perStem = [];
  let wSum = 0;
  let wMasked = 0;
  let wSmr = 0;

  for (let i = 0; i < N; i++) {
    const p = scaled[i];
    const active = stems[i].active;
    let own = 0;
    let masked = 0;
    let smrAcc = 0;
    let energy = 0;
    for (let t = 0; t < stems[i].numFrames; t++) {
      if (active && !active[t]) continue;
      const row = t * B;
      let peak = 0;
      for (let b = 0; b < B; b++) {
        masker[b] = Math.max(0, total[row + b] - p[row + b]);
        if (p[row + b] > peak) peak = p[row + b];
      }
      if (peak <= 0) continue;
      if (spread) {
        for (let b = 0; b < B; b++) {
          let acc = 0;
          for (let d = SPREAD_MIN; d <= SPREAD_MAX; d++) {
            const src = b - d;
            if (src < 0 || src >= B) continue;
            acc += masker[src] * kernel[d - SPREAD_MIN];
          }
          spreadM[b] = acc;
        }
      } else {
        spreadM.set(masker);
      }
      const floor = peak * ownFloor;
      for (let b = 0; b < B; b++) {
        const e = p[row + b];
        if (e < floor) continue;
        const smr = 10 * Math.log10(e / Math.max(spreadM[b], 1e-20));
        own++;
        energy += e;
        smrAcc += Math.max(-60, Math.min(60, smr));
        if (smr < thr) masked++;
      }
    }
    const maskedFraction = own > 0 ? masked / own : 0;
    const meanSmrDb = own > 0 ? smrAcc / own : 0;
    perStem.push({ maskedFraction, meanSmrDb, ownCells: own, energy });
    wSum += energy;
    wMasked += energy * maskedFraction;
    wSmr += energy * meanSmrDb;
  }
  return {
    stems: perStem,
    total: {
      maskedFraction: wSum > 0 ? wMasked / wSum : 0,
      meanSmrDb: wSum > 0 ? wSmr / wSum : 0,
    },
    thresholdDb,
    ownRangeDb,
    spread,
  };
}

// Convenience: before/after for a set of analyses and derived curves.
// erbGains (optional): per stem, the exact chain response on the ERB bands
// (see erbChainGainsDb in mixLoudness.js); otherwise the 16 band gains are
// mapped by centre frequency.
export function evaluateCurves(analyses, curves, opts = {}) {
  const { erbGains, ...rest } = opts;
  const mk = (withGains) =>
    analyses.map((a, i) => ({
      energies: a.erb.energies,
      numFrames: a.numFrames,
      active: a.active,
      faderDb: curves.faders[i],
      makeupDb: withGains ? curves.makeupDb[i] : 0,
      gains16: withGains ? curves.G[i] : null,
      erbGainsDb: withGains && erbGains ? erbGains[i] : undefined,
    }));
  return { before: smrReport(mk(false), rest), after: smrReport(mk(true), rest) };
}
