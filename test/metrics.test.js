import { describe, it, expect } from "vitest";
import { erbEdges, erbCentres, NUM_ERB, erbFrameEnergies, smrReport, spreadKernel, SPREAD_MIN, evaluateCurves, erbRate } from "../src/dsp/metrics.js";
import { analyzeStem } from "../src/dsp/analyze.js";
import { deriveCurves, knobDefaults, perTrackDefaults } from "../src/dsp/model.js";
import { sine, threeStems, addInto } from "./helpers/synth.js";

const sr = 48000;

function stem(mono, faderDb = 0, gains16 = null, makeupDb = 0) {
  const { energies, numFrames } = erbFrameEnergies(mono, sr);
  return { energies, numFrames, active: null, faderDb, makeupDb, gains16 };
}

describe("ERB bands and spreading", () => {
  it("covers 20 Hz to 20 kHz in one-ERB steps", () => {
    const e = erbEdges();
    expect(e[0]).toBeCloseTo(20, 6);
    expect(e[e.length - 1]).toBeCloseTo(20000, 3);
    expect(NUM_ERB).toBeGreaterThan(38);
    expect(NUM_ERB).toBeLessThan(44);
    for (let k = 1; k < e.length - 1; k++) expect(erbRate(e[k]) - erbRate(e[k - 1])).toBeCloseTo(1, 6);
    expect(erbCentres().length).toBe(NUM_ERB);
  });

  it("spreads upward more than downward", () => {
    const k = spreadKernel();
    expect(k[0 - SPREAD_MIN]).toBeCloseTo(1, 9);
    const up2 = 10 * Math.log10(k[2 - SPREAD_MIN]);
    const down2 = 10 * Math.log10(k[-2 - SPREAD_MIN]);
    expect(up2).toBeLessThan(0);
    expect(down2).toBeLessThan(up2);
    expect(up2).toBeGreaterThan(-12);
    expect(down2).toBeLessThan(-12);
  });
});

describe("smrReport", () => {
  const loud = sine(sr, 1, 1000, 1);
  const quiet = sine(sr, 1, 1000, 0.3); // -10.5 dB

  it("marks a quieter sine in the same band as masked and the louder one as clear", () => {
    const r = smrReport([stem(loud), stem(quiet)]);
    expect(r.stems[0].maskedFraction).toBe(0);
    expect(r.stems[1].maskedFraction).toBeGreaterThan(0.9);
    expect(r.stems[1].meanSmrDb).toBeLessThan(-8);
    expect(r.total.maskedFraction).toBeGreaterThan(0);
    expect(r.total.maskedFraction).toBeLessThan(0.2);
  });

  it("leaves a distant sine unmasked", () => {
    const far = sine(sr, 1, 6000, 0.3);
    const r = smrReport([stem(loud), stem(far)]);
    expect(r.stems[1].maskedFraction).toBe(0);
  });

  it("is asymmetric: a lower masker reaches up, a higher one does not reach down", () => {
    const m500 = sine(sr, 1, 500, 1);
    const v700 = sine(sr, 1, 700, 0.18); // -15 dB, about two ERB above
    const up = smrReport([stem(m500), stem(v700)]);
    const m700 = sine(sr, 1, 700, 1);
    const v500 = sine(sr, 1, 500, 0.18);
    const down = smrReport([stem(m700), stem(v500)]);
    expect(up.stems[1].maskedFraction).toBeGreaterThan(0.9);
    expect(down.stems[1].maskedFraction).toBe(0);
    expect(smrReport([stem(m500), stem(v700)], { spread: false }).stems[1].maskedFraction).toBe(0);
  });

  it("ignores a stem that overlaps nothing", () => {
    const base = smrReport([stem(loud), stem(quiet)]);
    const withHat = smrReport([stem(loud), stem(quiet), stem(sine(sr, 1, 12000, 1))]);
    expect(withHat.stems[0].maskedFraction).toBe(base.stems[0].maskedFraction);
    expect(withHat.stems[1].maskedFraction).toBe(base.stems[1].maskedFraction);
    expect(Math.abs(withHat.stems[1].meanSmrDb - base.stems[1].meanSmrDb)).toBeLessThan(0.1);
  });

  it("applies faders and 16-band gains", () => {
    const r = smrReport([stem(loud, -20), stem(quiet)]);
    expect(r.stems[1].maskedFraction).toBe(0);
    expect(r.stems[0].maskedFraction).toBeGreaterThan(0.9);
    const g = new Float64Array(16);
    g[8] = -20; // 1 kHz sits on the 8/9 boundary once mapped through ERB centres
    g[9] = -20;
    const cut = smrReport([stem(loud, 0, g), stem(quiet)]);
    expect(cut.stems[1].maskedFraction).toBe(0);
  });
});

describe("evaluateCurves on the three-stem fixture", () => {
  it("reduces the masked fraction after deriveCurves", () => {
    const { bass, guitar, pad } = threeStems(sr, 3);
    const analyses = [bass, guitar, pad].map((x) => analyzeStem(x, sr));
    expect(analyses[0].erb.energies.length).toBe(analyses[0].numFrames * NUM_ERB);
    expect(analyses[0].active.length).toBe(analyses[0].numFrames);
    const knobs = knobDefaults({ carveDb: 6, scoopDb: 0, floorDb: -24 });
    const curves = deriveCurves(analyses, [0, 0, -20], [perTrackDefaults(), perTrackDefaults(), perTrackDefaults()], knobs);
    const { before, after } = evaluateCurves(analyses, curves);
    expect(before.total.maskedFraction).toBeGreaterThan(0);
    expect(after.total.maskedFraction).toBeLessThan(before.total.maskedFraction);
    expect(after.total.meanSmrDb).toBeGreaterThan(before.total.meanSmrDb);
  });
});
