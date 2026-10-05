import { describe, it, expect } from "vitest";
import { encodeWav24, decodeWavPcm, parseWavHeader } from "../src/dsp/wav.js";
import { sine } from "./helpers/synth.js";

describe("wav", () => {
  it("round-trips 24-bit stereo to within 1 LSB", () => {
    const sr = 44100;
    const L = sine(sr, 0.05, 440, 0.8);
    const R = sine(sr, 0.05, 660, 0.3);
    const { arrayBuffer, clippedSamples } = encodeWav24([L, R], sr);
    expect(clippedSamples).toBe(0);
    const h = parseWavHeader(arrayBuffer);
    expect(h).toMatchObject({ sampleRate: sr, channels: 2, bitsPerSample: 24, format: 1, dataOffset: 44 });
    expect(h.dataLength).toBe(L.length * 2 * 3);
    const d = decodeWavPcm(arrayBuffer);
    expect(d.sampleRate).toBe(sr);
    for (let i = 0; i < L.length; i++) {
      expect(Math.abs(d.channels[0][i] - L[i])).toBeLessThan(1.5 / 8388608);
      expect(Math.abs(d.channels[1][i] - R[i])).toBeLessThan(1.5 / 8388608);
    }
  });

  it("counts clipped samples", () => {
    const x = Float32Array.from([0, 1.5, -2, 0.5]);
    const { clippedSamples } = encodeWav24([x], 48000);
    expect(clippedSamples).toBe(2);
    const d = decodeWavPcm(encodeWav24([x], 48000).arrayBuffer);
    expect(d.channels[0][1]).toBeCloseTo(1, 5);
    expect(d.channels[0][2]).toBeCloseTo(-1, 5);
  });

  it("decodes 16-bit and float32", () => {
    const n = 4;
    const buf16 = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf16);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, n * 2, true);
    v.setInt16(44, 16384, true); v.setInt16(46, -32768, true); v.setInt16(48, 0, true); v.setInt16(50, 32767, true);
    const d = decodeWavPcm(buf16);
    expect(Array.from(d.channels[0])).toEqual([0.5, -1, 0, 32767 / 32768]);

    const bufF = new ArrayBuffer(44 + n * 4);
    const f = new DataView(bufF);
    const wf = (o, s) => { for (let i = 0; i < s.length; i++) f.setUint8(o + i, s.charCodeAt(i)); };
    wf(0, "RIFF"); f.setUint32(4, 36 + n * 4, true); wf(8, "WAVE"); wf(12, "fmt ");
    f.setUint32(16, 16, true); f.setUint16(20, 3, true); f.setUint16(22, 1, true);
    f.setUint32(24, 8000, true); f.setUint32(28, 32000, true); f.setUint16(32, 4, true); f.setUint16(34, 32, true);
    wf(36, "data"); f.setUint32(40, n * 4, true);
    [0.25, -0.75, 1, 0].forEach((x, i) => f.setFloat32(44 + i * 4, x, true));
    const df = decodeWavPcm(bufF);
    expect(Array.from(df.channels[0])).toEqual([0.25, -0.75, 1, 0]);
  });
});
