import { bandEdges } from "../../src/dsp/bands.js";

// Deterministic PRNG (mulberry32).
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function silence(sampleRate, seconds) {
  return new Float32Array(Math.round(sampleRate * seconds));
}

export function sine(sampleRate, seconds, freq, amp = 1, phase = 0) {
  const n = Math.round(sampleRate * seconds);
  const out = new Float32Array(n);
  const w = (2 * Math.PI * freq) / sampleRate;
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin(w * i + phase);
  return out;
}

export function addInto(dst, src, gain = 1) {
  const n = Math.min(dst.length, src.length);
  for (let i = 0; i < n; i++) dst[i] += src[i] * gain;
  return dst;
}

// "Noise" confined exactly to bands lo..hi (inclusive): a set of random-phase
// sines spread log-uniformly inside each band. levelDb is the per-band level
// in the analyser's calibration (a single full-scale sine reads 0 dB).
export function bandNoise(sampleRate, seconds, loBand, hiBand, levelDb, { perBand = 30, seed = 1 } = {}) {
  const e = bandEdges();
  const r = rng(seed);
  const n = Math.round(sampleRate * seconds);
  const out = new Float32Array(n);
  const amp = Math.sqrt(Math.pow(10, levelDb / 10) / perBand);
  for (let b = loBand; b <= hiBand; b++) {
    for (let k = 0; k < perBand; k++) {
      const f = e[b] * Math.pow(e[b + 1] / e[b], (k + 0.5 + 0.4 * (r() - 0.5)) / perBand);
      if (f >= sampleRate / 2) continue;
      const ph = 2 * Math.PI * r();
      const w = (2 * Math.PI * f) / sampleRate;
      for (let i = 0; i < n; i++) out[i] += amp * Math.sin(w * i + ph);
    }
  }
  return out;
}

export function concat(...parts) {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Float32Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function peak(x) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  return m;
}

export function rmsDb(x) {
  let acc = 0;
  for (let i = 0; i < x.length; i++) acc += x[i] * x[i];
  return 10 * Math.log10(acc / x.length);
}

// Three synthetic stems matching the model test: bass (bands 2-4, harmonics
// 5-7 at -12), guitar (bands 6-10, body 2-4 at -15), pad (bands 4-12).
// Levels are relative; `padOffsetDb` bakes the pad quieter when asked.
export function threeStems(sampleRate, seconds, { refDb = -12, padOffsetDb = 0 } = {}) {
  const bass = bandNoise(sampleRate, seconds, 2, 4, refDb, { seed: 11 });
  addInto(bass, bandNoise(sampleRate, seconds, 5, 7, refDb - 12, { seed: 12 }));
  const guitar = bandNoise(sampleRate, seconds, 6, 10, refDb, { seed: 21 });
  addInto(guitar, bandNoise(sampleRate, seconds, 2, 4, refDb - 15, { seed: 22 }));
  const pad = bandNoise(sampleRate, seconds, 4, 12, refDb + padOffsetDb, { seed: 31 });
  return { bass, guitar, pad };
}
