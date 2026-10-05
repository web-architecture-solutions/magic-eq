import { describe, it, expect } from "vitest";
import { makeFFT, makeSpectrumAnalyser } from "../src/dsp/fft.js";
import { sine } from "./helpers/synth.js";

function naiveDft(re, im) {
  const n = re.length;
  const outRe = new Float64Array(n);
  const outIm = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < n; t++) {
      const a = (-2 * Math.PI * k * t) / n;
      outRe[k] += re[t] * Math.cos(a) - im[t] * Math.sin(a);
      outIm[k] += re[t] * Math.sin(a) + im[t] * Math.cos(a);
    }
  }
  return { re: outRe, im: outIm };
}

describe("fft", () => {
  it("matches a naive DFT for N = 16 and 64", () => {
    for (const n of [16, 64]) {
      const fft = makeFFT(n);
      const re = new Float64Array(n);
      const im = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        re[i] = Math.sin(i * 0.37) + 0.3 * Math.cos(i * 1.7);
        im[i] = 0.1 * Math.cos(i * 0.9);
      }
      const ref = naiveDft(re, im);
      fft.forward(re, im);
      for (let k = 0; k < n; k++) {
        expect(Math.abs(re[k] - ref.re[k])).toBeLessThan(1e-9);
        expect(Math.abs(im[k] - ref.im[k])).toBeLessThan(1e-9);
      }
    }
  });

  it("gives a flat magnitude for an impulse and satisfies Parseval", () => {
    const n = 256;
    const fft = makeFFT(n);
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    re[0] = 1;
    fft.forward(re, im);
    for (let k = 0; k < n; k++) expect(Math.hypot(re[k], im[k])).toBeCloseTo(1, 12);

    const x = new Float64Array(n);
    let e = 0;
    for (let i = 0; i < n; i++) {
      x[i] = Math.sin(i * 0.21) * Math.cos(i * 0.05);
      e += x[i] * x[i];
    }
    const xi = new Float64Array(n);
    fft.forward(x, xi);
    let E = 0;
    for (let k = 0; k < n; k++) E += x[k] * x[k] + xi[k] * xi[k];
    expect(E / n).toBeCloseTo(e, 9);
  });

  it("puts a sine at bin k and reads ~0 dB for a full-scale sine", () => {
    const n = 4096;
    const sr = 48000;
    const an = makeSpectrumAnalyser(n);
    const out = new Float64Array(n / 2 + 1);
    for (const k of [37, 100, 777.5]) {
      const f = (k * sr) / n;
      const x = sine(sr, n / sr, f, 1);
      an.powerSpectrumInto(x, 0, out);
      let best = 0;
      for (let i = 1; i < out.length; i++) if (out[i] > out[best]) best = i;
      expect(Math.abs(best - k)).toBeLessThanOrEqual(1);
      let sum = 0;
      for (let i = Math.floor(k) - 3; i <= Math.ceil(k) + 3; i++) sum += out[i];
      expect(10 * Math.log10(sum)).toBeCloseTo(0, 0);
    }
    expect(an.enbw).toBeCloseTo(1.5, 3);
  });
});
