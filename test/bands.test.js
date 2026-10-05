import { describe, it, expect } from "vitest";
import { bandEdges, bandCentres, BAND_Q, binRanges, bandIndexOf, NUM_BANDS } from "../src/dsp/bands.js";

describe("bands", () => {
  it("spans 20 Hz to 20480 Hz in 16 bands", () => {
    const e = bandEdges();
    expect(e.length).toBe(17);
    expect(e[0]).toBeCloseTo(20, 6);
    expect(e[16]).toBeCloseTo(20480, 3);
    for (let k = 1; k < 17; k++) expect(e[k] / e[k - 1]).toBeCloseTo(Math.pow(2, 0.625), 9);
  });

  it("has geometric centres and the matching peaking Q", () => {
    const c = bandCentres();
    expect(c[0]).toBeCloseTo(24.8, 0);
    expect(c[15]).toBeCloseTo(16491, -1);
    expect(BAND_Q).toBeCloseTo(2.29, 2);
  });

  it("maps frequencies to bands", () => {
    expect(bandIndexOf(19)).toBe(-1);
    expect(bandIndexOf(20)).toBe(0);
    expect(bandIndexOf(1000)).toBe(9);
    expect(bandIndexOf(20479)).toBe(15);
    expect(bandIndexOf(20480)).toBe(-1);
  });

  it("covers every FFT bin between 20 Hz and 20480 Hz exactly once", () => {
    for (const sr of [44100, 48000, 96000]) {
      const nfft = 4096;
      const r = binRanges(sr, nfft);
      const seen = new Map();
      for (let b = 0; b < NUM_BANDS; b++) {
        if (r[b].empty) continue;
        for (let k = r[b].lo; k <= r[b].hi; k++) {
          expect(seen.has(k)).toBe(false);
          seen.set(k, b);
        }
      }
      for (let k = 0; k <= nfft / 2; k++) {
        const f = (k * sr) / nfft;
        const inRange = f >= 20 && f < 20480;
        expect(seen.has(k)).toBe(inRange);
        if (inRange) expect(seen.get(k)).toBe(bandIndexOf(f));
      }
    }
  });

  it("flags the top band empty when it lies above Nyquist", () => {
    const r = binRanges(24000, 4096);
    expect(r[15].empty).toBe(true);
    expect(r[14].empty).toBe(false);
  });
});
