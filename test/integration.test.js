import { describe, it, expect } from "vitest";
import { analyzeStem } from "../src/dsp/analyze.js";
import { deriveCurves, knobDefaults, perTrackDefaults } from "../src/dsp/model.js";
import { buildGainTimelines } from "../src/dsp/timeline.js";
import { buildRecipe } from "../src/dsp/recipe.js";
import { NUM_BANDS } from "../src/dsp/bands.js";
import { threeStems, concat, silence } from "./helpers/synth.js";

const sr = 48000;
const BASS = 0, GTR = 1, PAD = 2;

describe("integration: synth stems through analysis, model, timeline, recipe", () => {
  const { bass, guitar, pad } = threeStems(sr, 3);
  // The pad enters at 1.5 s so the gate has something to do.
  const padLate = concat(silence(sr, 1.5), pad.subarray(0, sr * 1.5));
  const analyses = [bass, guitar, padLate].map((x) => analyzeStem(x, sr));
  const knobs = knobDefaults({ W: 3, T: -12, H: 6, D: 12, maxCut: 4, stackNorm: 0, floorDb: -40 });
  const perTrack = [perTrackDefaults(), perTrackDefaults(), perTrackDefaults()];
  const faders = [0, 0, -20];
  const curves = deriveCurves(analyses, faders, perTrack, knobs);

  it("measures the intended spectra", () => {
    expect(analyses[BASS].S[3]).toBeGreaterThan(-3);
    expect(analyses[BASS].S[6]).toBeLessThan(-9);
    expect(analyses[BASS].S[6]).toBeGreaterThan(-16);
    expect(analyses[GTR].S[8]).toBeGreaterThan(-3);
    expect(analyses[GTR].S[3]).toBeLessThan(-12);
    expect(analyses[PAD].gate.transitions[0].t).toBeGreaterThan(1.3);
    expect(analyses[PAD].gate.transitions[0].t).toBeLessThan(1.6);
  });

  it("reproduces the qualitative three-stem outcome", () => {
    for (let b = 2; b <= 4; b++) expect(curves.G[GTR][b]).toBeLessThan(-2.5);
    for (let b = 7; b <= 9; b++) expect(Math.abs(curves.G[GTR][b])).toBeLessThan(0.1);
    expect(curves.G[BASS][6]).toBeLessThan(-2.5);
    expect(curves.G[BASS][7]).toBeLessThan(-2.5);
    for (let b = 2; b <= 4; b++) expect(Math.abs(curves.G[BASS][b])).toBeLessThan(0.1);
    // The -20 dB pad carves nothing out of the bass's or guitar's main bands.
    for (let b = 2; b <= 4; b++) expect(curves.cross[BASS][PAD][b]).toBe(0);
    for (let b = 6; b <= 10; b++) expect(curves.cross[GTR][PAD][b]).toBe(0);
    expect(curves.G[PAD][6]).toBeCloseTo(-4, 1);
    for (let i = 0; i < 3; i++) for (let b = 0; b < NUM_BANDS; b++) {
      expect(curves.G[i][b]).toBeLessThanOrEqual(0);
      expect(curves.G[i][b]).toBeGreaterThanOrEqual(-4);
    }
    expect(curves.masking.after).toBeLessThan(curves.masking.before);
  });

  it("builds timelines and a recipe", () => {
    const timelines = buildGainTimelines(curves, analyses, knobs);
    // Pad cuts on the pad come from bass and guitar which play from t = 0, so
    // the pad's own timeline has no events; nobody is cut by the pad.
    expect(timelines[PAD].bands.every((e) => e.length === 0)).toBe(true);
    const recipe = buildRecipe({
      stems: [{ name: "bass", analysis: analyses[BASS] }, { name: "guitar", analysis: analyses[GTR] }, { name: "pad", analysis: analyses[PAD] }],
      curves, timelines, knobs, sampleRate: sr,
    });
    expect(recipe.version).toBe(1);
    expect(recipe.bands.length).toBe(16);
    expect(recipe.stems[GTR].gains[3]).toBeLessThan(-2.5);
    expect(recipe.stems[PAD].faderDb).toBe(-20);
    expect(recipe.stems[PAD].gate.transitions.length).toBe(1);
    expect(JSON.stringify(recipe).length).toBeGreaterThan(100);
  });
});
