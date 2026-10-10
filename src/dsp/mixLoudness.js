// Predicted integrated loudness of the mix under each listening condition,
// without rendering, so A/B comparisons can be loudness-matched instantly.
//
// Each stem contributes its measured integrated loudness (BS.1770) plus its
// fader and make-up, plus the change its EQ makes to its K-weighted power.
// That change is computed from the stem's long-term ERB spectrum and the
// exact magnitude response of the filters the engine runs (RBJ peaking and
// high-pass biquads, as Web Audio implements them). Stems are summed as
// uncorrelated powers. The absolute figure carries the usual error of that
// assumption (correlated mics read low), but the same error applies to every
// condition, so the differences between conditions, which are what matching
// needs, are much tighter than the absolute value.

import { kWeightingCoefficients } from "./loudness.js";
import { erbCentres } from "./metrics.js";
import { bandCentres, BAND_Q, NUM_BANDS } from "./bands.js";

// Butterworth: the engine's high-pass. Web Audio takes a high-pass Q in dB.
export const HPF_Q = Math.SQRT1_2;
export const HPF_Q_WEBAUDIO_DB = 20 * Math.log10(HPF_Q);

// |H(e^jw)|^2 of a biquad with a0 normalised to 1.
export function biquadPower(c, f, fs) {
  const w = (2 * Math.PI * f) / fs;
  const c1 = Math.cos(w);
  const s1 = Math.sin(w);
  const c2 = Math.cos(2 * w);
  const s2 = Math.sin(2 * w);
  const nr = c.b0 + c.b1 * c1 + c.b2 * c2;
  const ni = -(c.b1 * s1 + c.b2 * s2);
  const dr = 1 + c.a1 * c1 + c.a2 * c2;
  const di = -(c.a1 * s1 + c.a2 * s2);
  return (nr * nr + ni * ni) / (dr * dr + di * di);
}

function normalise(b0, b1, b2, a0, a1, a2) {
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

// RBJ cookbook peaking EQ, the Web Audio "peaking" BiquadFilterNode.
export function peakingCoefficients(f0, q, gainDb, fs) {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * q);
  const cw = Math.cos(w0);
  return normalise(1 + alpha * A, -2 * cw, 1 - alpha * A, 1 + alpha / A, -2 * cw, 1 - alpha / A);
}

// RBJ cookbook high-pass with a linear Q.
export function highpassCoefficients(f0, q, fs) {
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * q);
  const cw = Math.cos(w0);
  return normalise((1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + alpha, -2 * cw, 1 - alpha);
}

// K-weighting power at frequency f (the two BS.1770 stages).
const kCache = new Map();
export function kWeightPower(f, fs) {
  if (!kCache.has(fs)) kCache.set(fs, kWeightingCoefficients(fs));
  const { shelf, hp } = kCache.get(fs);
  return biquadPower(shelf, f, fs) * biquadPower(hp, f, fs);
}

// Power response of one stem's chain at f: peaking bands, high-pass and
// make-up. A bypassed stem plays the dry path, which has none of them.
export function chainPower(f, spec, fs) {
  if (!spec || spec.bypass) return 1;
  const q = spec.q > 0 ? spec.q : BAND_Q;
  const centres = bandCentres();
  let p = 1;
  const gains = spec.gains;
  if (gains) {
    for (let b = 0; b < NUM_BANDS; b++) {
      const g = gains[b];
      if (!g || centres[b] >= (fs / 2) * 0.95) continue;
      p *= biquadPower(peakingCoefficients(centres[b], q, g, fs), f, fs);
    }
  }
  if (spec.hpfHz > 0) p *= biquadPower(highpassCoefficients(spec.hpfHz, HPF_Q, fs), f, fs);
  return p * Math.pow(10, (spec.makeupDb || 0) / 10);
}

// The chain's gain (dB) at each ERB band centre, without make-up: what the
// masking metric applies to a stem's ERB energies.
export function erbChainGainsDb(spec, fs) {
  return Float64Array.from(erbCentres(), (f) => (f >= fs / 2 ? 0 : 10 * Math.log10(chainPower(f, { ...spec, makeupDb: 0 }, fs))));
}

// Change in a stem's K-weighted power (dB) caused by its chain, weighted by
// its long-term ERB spectrum (power mean over active frames).
export function chainLoudnessDeltaDb(erbMeanDb, spec, fs) {
  if (!spec || spec.bypass) return 0;
  const centres = erbCentres();
  let before = 0;
  let after = 0;
  for (let b = 0; b < centres.length; b++) {
    const f = centres[b];
    if (f >= fs / 2) continue;
    const w = Math.pow(10, erbMeanDb[b] / 10) * kWeightPower(f, fs);
    before += w;
    after += w * chainPower(f, spec, fs);
  }
  if (!(before > 0) || !(after > 0)) return 0;
  return 10 * Math.log10(after / before);
}

// items: [{ lufs, faderDb, deltaDb, muted }] -> predicted mix LUFS.
export function predictMixLoudness(items) {
  let p = 0;
  for (const it of items) {
    if (it.muted || !Number.isFinite(it.lufs)) continue;
    p += Math.pow(10, (it.lufs + (it.faderDb || 0) + (it.deltaDb || 0)) / 10);
  }
  return p > 0 ? 10 * Math.log10(p) : -Infinity;
}

// The three listening conditions as engine specs, from the EQ specs.
//   raw:      every stem at unity, no EQ (the stems as tracked)
//   balanced: the faders from the Gain workspace, no EQ
//   eq:       faders and EQ (the active flow)
export function conditionSpecs(eqSpecs, condition) {
  if (condition === "eq") return eqSpecs;
  return eqSpecs.map((s) => ({ ...s, bypass: true, faderDb: condition === "raw" ? 0 : s.faderDb }));
}

export const CONDITIONS = ["raw", "balanced", "eq"];

// Predicted mix loudness for every condition. stems: [{ lufs, erbMeanDb }]
// aligned with eqSpecs.
export function predictConditions(stems, eqSpecs, fs) {
  const out = {};
  const deltas = eqSpecs.map((s, i) => (stems[i]?.erbMeanDb ? chainLoudnessDeltaDb(stems[i].erbMeanDb, s, fs) : 0));
  for (const c of CONDITIONS) {
    const specs = conditionSpecs(eqSpecs, c);
    out[c] = predictMixLoudness(
      specs.map((s, i) => ({
        lufs: stems[i]?.lufs,
        faderDb: s.faderDb || 0,
        // A bypassed stem plays dry: its make-up and EQ are out of the path.
        deltaDb: s.bypass ? 0 : deltas[i],
        muted: s.muted,
      }))
    );
  }
  return { loudness: out, deltas };
}

// Monitor gain that brings a condition to the listening level. The master
// trim sits before the monitor, so it is taken back out here.
export function monitorGainDb(predictedLufs, listenLufs, masterTrimDb = 0) {
  if (!Number.isFinite(predictedLufs)) return 0;
  return listenLufs - predictedLufs - (masterTrimDb || 0);
}
