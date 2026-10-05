import { describe, it, expect } from "vitest";
import { frameRmsDb, detectGate, envelopeAt, envelopeSeries } from "../src/dsp/gate.js";
import { sine, silence, concat } from "./helpers/synth.js";

describe("gate", () => {
  const sr = 48000;
  const hop = 2048;
  const frameRate = sr / hop;

  it("detects one entry near the midpoint of a half-silent stem", () => {
    const x = concat(silence(sr, 2), sine(sr, 2, 440, 0.5));
    const rms = frameRmsDb(x, 4096, hop);
    const g = detectGate(rms, { thresholdDb: -50, hysteresisDb: 6, holdSec: 0.25, frameRate });
    expect(g.transitions.length).toBe(1);
    expect(g.transitions[0].on).toBe(true);
    expect(g.transitions[0].t).toBeGreaterThan(1.8);
    expect(g.transitions[0].t).toBeLessThan(2.05);
    expect(g.activeFraction).toBeGreaterThan(0.45);
    expect(g.activeFraction).toBeLessThan(0.55);
  });

  it("holds through short dips and releases after the hold time", () => {
    const x = concat(sine(sr, 1, 440, 0.5), silence(sr, 0.1), sine(sr, 1, 440, 0.5), silence(sr, 1));
    const rms = frameRmsDb(x, 4096, hop);
    const g = detectGate(rms, { thresholdDb: -50, hysteresisDb: 6, holdSec: 0.25, frameRate });
    expect(g.transitions.map((t) => t.on)).toEqual([true, false]);
    expect(g.transitions[1].t).toBeGreaterThan(2.0);
    expect(g.transitions[1].t).toBeLessThan(2.3);
  });

  it("evaluates the one-pole envelope", () => {
    const tr = [{ t: 1, on: true }, { t: 3, on: false }];
    expect(envelopeAt(tr, 0.15, 0.4, 0.5)).toBe(0);
    expect(envelopeAt(tr, 0.15, 0.4, 1)).toBe(0);
    expect(envelopeAt(tr, 0.15, 0.4, 1.15)).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(envelopeAt(tr, 0.15, 0.4, 2.9)).toBeGreaterThan(0.99);
    const v3 = envelopeAt(tr, 0.15, 0.4, 3);
    expect(envelopeAt(tr, 0.15, 0.4, 3.4)).toBeCloseTo(v3 * Math.exp(-1), 9);
    const series = envelopeSeries(tr, 0.15, 0.4, [0.5, 1.15, 2.9, 3.4]);
    expect(series[1]).toBeCloseTo(1 - Math.exp(-1), 6);
    expect(series[3]).toBeCloseTo(v3 * Math.exp(-1), 6);
  });
});
