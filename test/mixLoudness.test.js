import { describe, it, expect } from "vitest";
import {
  biquadPower,
  peakingCoefficients,
  highpassCoefficients,
  chainLoudnessDeltaDb,
  predictConditions,
  conditionSpecs,
  monitorGainDb,
  HPF_Q,
} from "../src/dsp/mixLoudness.js";
import { analyzeChannels } from "../src/dsp/analyze.js";
import { integratedLoudness } from "../src/dsp/loudness.js";
import { bandCentres, bandIndexOf, BAND_Q, NUM_BANDS } from "../src/dsp/bands.js";

const FS = 48000;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
}

function noise(seconds, seed, amp, lowpass = 0) {
  const r = rng(seed);
  const n = Math.round(seconds * FS);
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const x = r() * 2;
    y = lowpass > 0 ? y + lowpass * (x - y) : x;
    out[i] = amp * y;
  }
  return out;
}

function filter(x, c) {
  const out = new Float32Array(x.length);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const y = c.b0 * v + z1;
    z1 = c.b1 * v - c.a1 * y + z2;
    z2 = c.b2 * v - c.a2 * y;
    out[i] = y;
  }
  return out;
}

// What the engine does to one stem: fader, high-pass, 16 peaking bands, make-up.
function runChain(x, spec) {
  let y = x;
  if (!spec.bypass) {
    if (spec.hpfHz > 0) y = filter(y, highpassCoefficients(spec.hpfHz, HPF_Q, FS));
    const centres = bandCentres();
    for (let b = 0; b < NUM_BANDS; b++) if (spec.gains[b]) y = filter(y, peakingCoefficients(centres[b], spec.q || BAND_Q, spec.gains[b], FS));
  }
  const g = Math.pow(10, ((spec.faderDb || 0) + (spec.bypass ? 0 : spec.makeupDb || 0)) / 20);
  const out = new Float32Array(y.length);
  for (let i = 0; i < y.length; i++) out[i] = y[i] * g;
  return out;
}

function mixLufs(stems, specs) {
  const n = stems[0].length;
  const mix = new Float32Array(n);
  stems.forEach((x, i) => {
    if (specs[i].muted) return;
    const y = runChain(x, specs[i]);
    for (let k = 0; k < n; k++) mix[k] += y[k];
  });
  return integratedLoudness([mix], FS).lufs;
}

describe("filter responses", () => {
  it("peaking power at its centre equals its gain", () => {
    for (const g of [-9, -3, 4]) {
      const c = peakingCoefficients(1000, 2, g, FS);
      expect(10 * Math.log10(biquadPower(c, 1000, FS))).toBeCloseTo(g, 6);
      expect(10 * Math.log10(biquadPower(c, 20, FS))).toBeCloseTo(0, 2);
    }
  });

  it("Butterworth high-pass is 3 dB down at its corner", () => {
    const c = highpassCoefficients(80, HPF_Q, FS);
    expect(10 * Math.log10(biquadPower(c, 80, FS))).toBeCloseTo(-3.01, 2);
    expect(10 * Math.log10(biquadPower(c, 2000, FS))).toBeCloseTo(0, 2);
  });

  it("make-up alone shifts loudness by exactly its gain; bypass by nothing", () => {
    const flat = new Float64Array(41).fill(-30);
    const spec = { gains: new Float64Array(NUM_BANDS), makeupDb: 2.5 };
    expect(chainLoudnessDeltaDb(flat, spec, FS)).toBeCloseTo(2.5, 9);
    expect(chainLoudnessDeltaDb(flat, { ...spec, bypass: true }, FS)).toBe(0);
  });
});

describe("predicted mix loudness against measured", () => {
  const A = noise(12, 1, 0.4, 0.05); // dark, bass-heavy
  const B = noise(12, 2, 0.08); // white, bright
  const C = noise(12, 3, 0.2, 0.3);
  const stems = [A, B, C];
  const analyses = stems.map((x) => analyzeChannels([x], FS));
  const gA = new Float64Array(NUM_BANDS);
  gA[bandIndexOf(100)] = -6;
  gA[bandIndexOf(1000)] = -3;
  const gB = new Float64Array(NUM_BANDS);
  gB[bandIndexOf(4000)] = -4;
  const gC = new Float64Array(NUM_BANDS);
  gC[bandIndexOf(250)] = -5;
  gC[bandIndexOf(500)] = -2;
  const eqSpecs = [
    { faderDb: -3, makeupDb: 1.5, gains: gA, q: 0 },
    { faderDb: -9, makeupDb: 0.5, gains: gB, q: 2, hpfHz: 200 },
    { faderDb: -6, makeupDb: 0, gains: gC, q: 0 },
  ];
  const info = analyses.map((a) => ({ lufs: a.lufs, erbMeanDb: a.erb.meanDb }));
  const { loudness } = predictConditions(info, eqSpecs, FS);
  const measured = Object.fromEntries(["raw", "balanced", "eq"].map((c) => [c, mixLufs(stems, conditionSpecs(eqSpecs, c))]));

  it("each condition is predicted within 0.5 LU", () => {
    for (const c of ["raw", "balanced", "eq"]) expect(Math.abs(loudness[c] - measured[c])).toBeLessThan(0.5);
  });

  it("differences between conditions are predicted within 0.3 LU", () => {
    expect(Math.abs(loudness.eq - loudness.balanced - (measured.eq - measured.balanced))).toBeLessThan(0.3);
    expect(Math.abs(loudness.raw - loudness.balanced - (measured.raw - measured.balanced))).toBeLessThan(0.3);
  });

  it("muted stems drop out of the prediction", () => {
    const muted = eqSpecs.map((s, i) => ({ ...s, muted: i === 0 }));
    const p = predictConditions(info, muted, FS).loudness.eq;
    expect(Math.abs(p - mixLufs(stems, muted))).toBeLessThan(0.5);
    expect(p).toBeLessThan(loudness.eq);
  });

  it("the monitor gain lands every condition at the listening level", () => {
    for (const c of ["raw", "balanced", "eq"]) {
      const m = monitorGainDb(loudness[c], -18, -4);
      expect(measured[c] - 4 + m).toBeCloseTo(-18, 0);
    }
    expect(monitorGainDb(-Infinity, -18)).toBe(0);
  });
});
