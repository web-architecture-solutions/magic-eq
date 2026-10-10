import { describe, it, expect } from "vitest";
import { deriveLitCurves, hpfForRole } from "../src/dsp/litModel.js";
import { knobDefaults, aWeightDb } from "../src/dsp/common.js";
import { NUM_BANDS, bandCentres } from "../src/dsp/bands.js";
import { spec } from "./helpers/spec.js";

const range = (lo, hi, v) => {
  const o = {};
  for (let b = lo; b <= hi; b++) o[b] = v;
  return o;
};
const BASE = { litBalance: false, litMasking: true, litBalanceWeighting: "none", litAmount: 0.5, litEssentialDb: 12, litTopK: 3, litMaxCut: 12, litHpf: false, litMakeup: false, floorDb: -24 };

describe("literature flow: masking reduction (Hafezi & Reiss)", () => {
  // Masker: loud in bands 2-4, has a nonessential tail in 6-7 at -20.
  // Maskee: essential in 6-7 (0 dB) but 10 dB quieter than the masker there at mix level.
  const masker = spec({ ...range(2, 4, 0), ...range(6, 7, -20) });
  const maskee = spec(range(6, 7, 0));
  const faders = [0, -30]; // maskee sits 30 dB down -> masker tail (-20) is 10 dB above it

  it("cuts the masker where it dominates a band it does not need", () => {
    const c = deriveLitCurves([masker, maskee], faders, knobDefaults(BASE));
    expect(c.dom[1][0][6]).toBeCloseTo(10, 9); // masking value, masker over maskee, band 6
    expect(c.G[0][6]).toBeCloseTo(-5, 9); // amount 0.5 x 10 dB
    expect(c.G[0][7]).toBeCloseTo(-5, 9);
    for (let b = 2; b <= 4; b++) expect(c.G[0][b]).toBe(0); // essential for the masker: untouched
    for (let b = 0; b < NUM_BANDS; b++) expect(c.G[1][b]).toBe(0); // the maskee is not cut
    expect(c.litMasking.before).toBeCloseTo(20, 9);
    expect(c.litMasking.after).toBeCloseTo(10, 9);
  });

  it("can cut the maskee instead, as a comparison toggle", () => {
    const c = deriveLitCurves([masker, maskee], faders, knobDefaults({ ...BASE, litCutTarget: "maskee" }));
    expect(c.G[0][6]).toBe(0);
    expect(c.G[1][6]).toBeCloseTo(-5, 9);
  });

  it("does nothing where the band is essential for the masker too", () => {
    const m2 = spec({ ...range(2, 4, 0), ...range(6, 7, -6) }); // 6-7 within 12 dB: essential for the masker
    const c = deriveLitCurves([m2, maskee], [0, -20], knobDefaults(BASE));
    expect(c.G[0][6]).toBe(0);
    expect(c.occurrences.length).toBe(0);
  });

  it("keeps only the strongest K occurrences per track", () => {
    const wide = spec({ ...range(2, 3, 0), ...range(5, 10, -20) });
    const victim = spec(range(5, 10, 0));
    const c = deriveLitCurves([wide, victim], [0, -30], knobDefaults({ ...BASE, litTopK: 2 }));
    const cut = Array.from(c.G[0]).filter((g) => g < 0).length;
    expect(cut).toBe(2);
    const c3 = deriveLitCurves([wide, victim], [0, -30], knobDefaults({ ...BASE, litTopK: 6 }));
    expect(Array.from(c3.G[0]).filter((g) => g < 0).length).toBe(6);
  });

  it("scales with Amount, clamps at Max cut, reports Q, and marks the occurrences it acts on", () => {
    const c = deriveLitCurves([masker, maskee], faders, knobDefaults({ ...BASE, litAmount: 1, litMaxCut: 8, litQ: 2 }));
    expect(c.G[0][6]).toBeCloseTo(-8, 9);
    expect(c.unclamped[0][6]).toBeCloseTo(-10, 9);
    expect(c.bandQ).toBe(2);
    expect(c.occurrences.filter((o) => o.selected).map((o) => o.b).sort()).toEqual([6, 7]);
  });

  it("applies perceptual weighting to the masking test", () => {
    const c = deriveLitCurves([masker, maskee], faders, knobDefaults({ ...BASE, litBalanceWeighting: "a" }));
    expect(c.dom[1][0][6]).toBeCloseTo(10, 9); // same band on both sides: weighting cancels
    const f = bandCentres();
    expect(aWeightDb(f[3])).toBeLessThan(aWeightDb(f[9]));
  });
});

describe("literature flow: spectral balance (Perez-Gonzalez & Reiss) and rules", () => {
  it("pushes each stem's band toward the cross-channel average, cuts only by default", () => {
    const a = spec({ 4: 0, 8: -10 });
    const b = spec({ 4: -10, 8: 0 });
    const knobs = knobDefaults({ ...BASE, litBalance: true, litMasking: false, litAmount: 1 });
    const c = deriveLitCurves([a, b], [0, 0], knobs);
    expect(c.levelTerm[0][4]).toBeCloseTo(-5, 9); // 0 toward -5
    expect(c.levelTerm[0][8]).toBe(0); // would be a boost; boosts off
    expect(c.levelTerm[1][8]).toBeCloseTo(-5, 9);
    const boosts = deriveLitCurves([a, b], [0, 0], knobDefaults({ ...knobs, litBalanceBoosts: true }));
    expect(boosts.levelTerm[0][8]).toBeCloseTo(5, 9);
    expect(boosts.G[0][8]).toBeCloseTo(5, 9);
  });

  it("high-passes by role", () => {
    const k = knobDefaults({ litHpf: true, litHpfHz: 90 });
    expect(hpfForRole("kick", k)).toBe(0);
    expect(hpfForRole("bass", k)).toBe(0);
    expect(hpfForRole("leadVocal", k)).toBe(90);
    expect(hpfForRole("rhythm", { ...k, litHpf: false })).toBe(0);
    const c = deriveLitCurves([spec({ 4: 0 }), spec({ 9: 0 })], [0, 0], knobDefaults({ ...BASE, litHpf: true }), ["bass", "leadVocal"]);
    expect(Array.from(c.hpfHz)).toEqual([0, 80]);
  });

  it("returns everything the engine, plots, matrix and export read", () => {
    const c = deriveLitCurves([spec({ 4: 0 }), spec({ 9: 0 })], [0, 0], knobDefaults(BASE));
    for (const k of ["G", "unclamped", "levelTerm", "crossTerm", "makeupDb", "effect", "ceilingBands", "pairContribution", "audible", "faders", "live", "hpfHz", "bandQ", "litMasking", "occurrences"]) expect(c[k]).toBeDefined();
    expect(c.G.length).toBe(2);
  });

  it("is invariant to a global fader offset", () => {
    const a = spec({ ...range(2, 4, 0), ...range(6, 7, -20) });
    const b = spec(range(6, 7, 0));
    const k = knobDefaults({ ...BASE, litBalance: true });
    const c1 = deriveLitCurves([a, b], [0, -30], k);
    const c2 = deriveLitCurves([a, b], [-9, -39], k);
    for (let i = 0; i < 2; i++) for (let x = 0; x < NUM_BANDS; x++) expect(c2.G[i][x]).toBeCloseTo(c1.G[i][x], 9);
  });

  it("ignores faders when stems are post-fader", () => {
    const a = spec({ ...range(2, 4, 0), ...range(6, 7, -20) });
    const b = spec(range(6, 7, 0));
    const c = deriveLitCurves([a, b], [0, -30], knobDefaults({ ...BASE, postFader: true }));
    expect(Array.from(c.faders)).toEqual([0, 0]);
    expect(c.occurrences.length).toBe(0); // at equal level the masker's -20 dB tail never dominates
  });
});
