import { describe, it, expect } from "vitest";
import { analyzeStem } from "../src/dsp/analyze.js";
import { bandCentres, NUM_BANDS } from "../src/dsp/bands.js";
import { sine, silence, concat, bandNoise } from "./helpers/synth.js";

const sr = 48000;

describe("analyzeStem", () => {
  it("lands a sine at each band centre in its band at ~0 dB", () => {
    const c = bandCentres();
    for (let b = 1; b < NUM_BANDS; b++) {
      const a = analyzeStem(sine(sr, 1, c[b], 1), sr);
      let best = 0;
      for (let k = 0; k < NUM_BANDS; k++) if (a.bandDb[k] > a.bandDb[best]) best = k;
      expect(best).toBe(b);
      expect(a.bandDb[b]).toBeGreaterThan(-1);
      expect(a.bandDb[b]).toBeLessThan(1);
      expect(a.S[b]).toBe(0);
    }
  });

  it("reads band-limited noise flat within 3 dB and >= 25 dB down two bands away", () => {
    const a = analyzeStem(bandNoise(sr, 3, 6, 10, -12), sr);
    for (let b = 6; b <= 10; b++) {
      expect(Math.abs(a.bandDb[b] + 12)).toBeLessThan(3);
    }
    expect(a.bandDb[4]).toBeLessThan(-12 - 25);
    expect(a.bandDb[12]).toBeLessThan(-12 - 25);
    expect(a.gate.activeFraction).toBeGreaterThan(0.95);
  });

  it("averages only over active frames", () => {
    const tone = bandNoise(sr, 2, 6, 8, -12);
    const half = analyzeStem(concat(silence(sr, 2), tone), sr);
    const full = analyzeStem(tone, sr);
    expect(half.gate.transitions.length).toBe(1);
    expect(half.gate.transitions[0].t).toBeGreaterThan(1.8);
    expect(half.gate.activeFraction).toBeGreaterThan(0.45);
    expect(half.gate.activeFraction).toBeLessThan(0.55);
    for (let b = 6; b <= 8; b++) expect(Math.abs(half.bandDb[b] - full.bandDb[b])).toBeLessThan(0.5);
    expect(half.empty).toBe(false);
  });

  it("flags a silent stem as empty", () => {
    const a = analyzeStem(silence(sr, 1), sr);
    expect(a.empty).toBe(true);
    expect(a.gate.transitions.length).toBe(0);
  });

  it("puts two tones in their own bands, relative to the loudest", () => {
    const c = bandCentres();
    const x = sine(sr, 1, c[4], 1);
    const y = sine(sr, 1, c[7], 0.5);
    for (let i = 0; i < x.length; i++) x[i] += y[i];
    const a = analyzeStem(x, sr);
    expect(a.S[4]).toBeCloseTo(0, 6);
    expect(a.S[7]).toBeCloseTo(-6.02, 0);
    expect(a.S[5] - a.S[7]).toBeLessThan(-10);
    for (let b = 0; b < NUM_BANDS; b++) expect(a.S[b]).toBeLessThanOrEqual(0);
  });

  it("reports progress", () => {
    const calls = [];
    analyzeStem(sine(sr, 2, 440, 0.5), sr, { progressEvery: 10 }, (p) => calls.push(p));
    expect(calls[calls.length - 1]).toBe(1);
    expect(calls.length).toBeGreaterThan(2);
  });
});
