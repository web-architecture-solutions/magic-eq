import { describe, it, expect } from "vitest";
import { analyzeStem } from "../src/dsp/analyze.js";
import { knobDefaults } from "../src/dsp/common.js";
import { deriveLitCurves } from "../src/dsp/litModel.js";
import { buildRecipe } from "../src/dsp/recipe.js";
import { NUM_BANDS, bandIndexOf } from "../src/dsp/bands.js";
import { threeStems, concat, silence } from "./helpers/synth.js";

const sr = 48000;
const BASS = 0, GTR = 1, PAD = 2;

describe("integration: synth stems through analysis, the literature EQ, and the recipe", () => {
  const { bass, guitar, pad } = threeStems(sr, 3);
  // The pad enters at 1.5 s so the activity gate has something to do.
  const padLate = concat(silence(sr, 1.5), pad.subarray(0, sr * 1.5));
  const analyses = [bass, guitar, padLate].map((x) => analyzeStem(x, sr));
  const roles = ["bass", "rhythm", "pad"];
  const knobs = knobDefaults({ litAmount: 1 });
  const faders = [0, 0, -20];
  const curves = deriveLitCurves(analyses, faders, knobs, roles);

  it("measures the intended spectra and activity", () => {
    expect(analyses[BASS].S[3]).toBeGreaterThan(-3);
    expect(analyses[BASS].S[6]).toBeLessThan(-9);
    expect(analyses[GTR].S[8]).toBeGreaterThan(-3);
    expect(analyses[GTR].S[3]).toBeLessThan(-12);
    expect(analyses[PAD].gate.transitions[0].t).toBeGreaterThan(1.3);
    expect(analyses[PAD].gate.transitions[0].t).toBeLessThan(1.6);
  });

  it("cuts the guitar where it masks the quiet pad, and nothing else", () => {
    const sel = curves.occurrences.filter((o) => o.selected);
    expect(sel.length).toBeGreaterThan(0);
    for (const o of sel) {
      expect(o.i).toBe(GTR); // masker
      expect(o.j).toBe(PAD); // maskee
      expect(curves.G[GTR][o.b]).toBeCloseTo(-Math.min(o.m, knobs.litMaxCut), 6);
    }
    for (let b = 0; b < NUM_BANDS; b++) {
      expect(curves.G[BASS][b]).toBe(0);
      expect(curves.G[PAD][b]).toBe(0);
      expect(curves.G[GTR][b]).toBeLessThanOrEqual(0);
    }
    // The guitar's own main bands are essential to it: untouched.
    for (let b = bandIndexOf(1000); b <= bandIndexOf(2000); b++) expect(curves.G[GTR][b]).toBe(0);
    expect(curves.litMasking.after).toBeLessThan(curves.litMasking.before);
    expect(Array.from(curves.hpfHz)).toEqual([0, 80, 80]);
  });

  it("builds a version-3 recipe with Q, high-pass and gains", () => {
    const recipe = buildRecipe({
      stems: [{ name: "bass", role: "bass", analysis: analyses[BASS] }, { name: "guitar", role: "rhythm", analysis: analyses[GTR] }, { name: "pad", role: "pad", analysis: analyses[PAD] }],
      curves,
      knobs,
      sampleRate: sr,
    });
    expect(recipe.version).toBe(3);
    expect(recipe.bandQ).toBe(2);
    expect(recipe.bands.length).toBe(16);
    expect(recipe.stems[PAD].faderDb).toBe(-20);
    expect(recipe.stems[GTR].hpfHz).toBe(80);
    expect(recipe.stems[BASS].hpfHz).toBe(0);
    expect(Math.min(...recipe.stems[GTR].gains)).toBeLessThan(-1);
    expect(recipe.knobs.litAmount).toBe(1);
    expect(recipe.knobs.carveDb).toBeUndefined();
  });
});
