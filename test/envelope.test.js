import { describe, it, expect } from "vitest";
import { modeEnvelope } from "../src/dsp/envelope.js";

describe("modeEnvelope", () => {
  it("is >= S, equals S at maxima, and bridges valleys", () => {
    const S = Float64Array.from([-40, -30, 0, -20, -25, -10, -35, -50]);
    const E = modeEnvelope(S);
    for (let b = 0; b < S.length; b++) expect(E[b]).toBeGreaterThanOrEqual(S[b]);
    expect(E[2]).toBe(0);
    expect(E[5]).toBe(-10);
    expect(E[3]).toBeCloseTo(-10 / 3, 9);
    expect(E[4]).toBeCloseTo(-20 / 3, 9);
    expect(E[0]).toBe(0);
    expect(E[7]).toBe(-10);
  });

  it("returns S for a monotone spectrum", () => {
    const S = Float64Array.from([0, -5, -10, -15]);
    const E = modeEnvelope(S);
    expect(Array.from(E)).toEqual([0, 0, 0, 0]);
  });
});
