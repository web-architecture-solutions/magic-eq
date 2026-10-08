import { describe, it, expect } from "vitest";
import { kWeightingCoefficients, integratedLoudness, samplePeakDb, framePeaksDb } from "../src/dsp/loudness.js";
import { sine, concat } from "./helpers/synth.js";

const fs = 48000;
const dbfs = (db) => Math.pow(10, db / 20);
const tone = (seconds, db, rate = fs) => sine(rate, seconds, 997, dbfs(db));

describe("K-weighting", () => {
  it("reproduces the BS.1770 Annex 1 table at 48 kHz", () => {
    const { shelf, hp } = kWeightingCoefficients(48000);
    expect(shelf.b0).toBeCloseTo(1.53512485958697, 6);
    expect(shelf.b1).toBeCloseTo(-2.69169618940638, 6);
    expect(shelf.b2).toBeCloseTo(1.19839281085285, 6);
    expect(shelf.a1).toBeCloseTo(-1.69065929318241, 6);
    expect(shelf.a2).toBeCloseTo(0.73248077421585, 6);
    expect(hp.b0).toBe(1);
    expect(hp.b1).toBe(-2);
    expect(hp.a1).toBeCloseTo(-1.99004745483398, 6);
    expect(hp.a2).toBeCloseTo(0.99007225036621, 6);
  });
});

describe("integrated loudness", () => {
  it("reads a full-scale 997 Hz sine at -3.01 LUFS per channel, 0 as dual-mono", () => {
    const x = tone(2, 0);
    expect(integratedLoudness([x], fs, { monoAsDualMono: false }).lufs).toBeCloseTo(-3.01, 1);
    expect(integratedLoudness([x], fs).lufs).toBeCloseTo(0.0, 1);
    expect(integratedLoudness([x, x], fs).lufs).toBeCloseTo(0.0, 1);
    const y = tone(2, 0, 44100);
    expect(integratedLoudness([y], 44100, { monoAsDualMono: false }).lufs).toBeCloseTo(-3.01, 1);
  });

  it("passes the EBU Tech 3341 level and gating cases", () => {
    const stereo = (x) => [x, x];
    expect(integratedLoudness(stereo(tone(5, -23)), fs).lufs).toBeCloseTo(-23.0, 1);
    expect(integratedLoudness(stereo(tone(5, -33)), fs).lufs).toBeCloseTo(-33.0, 1);
    const rel = concat(tone(10, -36), tone(60, -23), tone(10, -36));
    expect(integratedLoudness(stereo(rel), fs).lufs).toBeCloseTo(-23.0, 1);
    const abs = concat(tone(10, -72), tone(60, -23), tone(10, -72));
    expect(integratedLoudness(stereo(abs), fs).lufs).toBeCloseTo(-23.0, 1);
    const avg = concat(tone(20, -26), tone(20, -20), tone(20, -26));
    expect(integratedLoudness(stereo(avg), fs).lufs).toBeCloseTo(-23.0, 1);
  });

  it("gates silence and short signals", () => {
    expect(integratedLoudness([new Float32Array(fs)], fs).lufs).toBe(-Infinity);
    expect(integratedLoudness([tone(0.2, -20)], fs).lufs).toBe(-Infinity);
  });

  it("measures peaks per channel and per frame", () => {
    const l = sine(fs, 0.5, 100, 0.5);
    const r = sine(fs, 0.5, 100, 0.25);
    expect(samplePeakDb([l, r])).toBeCloseTo(-6.02, 1);
    const fp = framePeaksDb([l, r], 4096, 2048);
    expect(fp.length).toBeGreaterThan(5);
    for (const v of fp) expect(v).toBeCloseTo(-6.02, 0);
  });
});
