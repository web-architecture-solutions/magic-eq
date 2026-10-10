import { describe, it, expect } from "vitest";
import { balanceLoudness, anchorFaders, predictMixPeak, masterTrimFor } from "../src/dsp/balance.js";
import { guessRole, DEFAULT_ROLE_OFFSETS } from "../src/dsp/roles.js";
import { analyzeChannels } from "../src/dsp/analyze.js";
import { NUM_BANDS } from "../src/dsp/bands.js";
import { sine, threeStems } from "./helpers/synth.js";

const sr = 48000;

describe("roles", () => {
  it("guesses the Human Radio stems", () => {
    const cases = {
      "DRUMS -Kick M82_01.wav": "kick",
      "DRUMS - Snare Top M80_01.wav": "snare",
      "DRUMS -OH L AR_01.wav": "cymbals",
      "DRUMS - Hat 260_01.wav": "cymbals",
      "DRUMS - Tom 1 M80_01.wav": "drums",
      "DRUMS -Room L AR_01.wav": "room",
      "Bass CU_01.wav": "bass",
      "Bass Drum.wav": "kick",
      "Guitar AK_01.wav": "rhythm",
      "Organ L 260_01.wav": "rhythm",
      "Piano L CU_01.wav": "rhythm",
      "Vox 47_01.wav": "leadVocal",
      "BGV 1 251_01.wav": "backingVocal",
      "Lead Gtr.wav": "lead",
      "Strings pad.wav": "pad",
      "mystery.wav": "other",
    };
    for (const [name, role] of Object.entries(cases)) expect(guessRole(name), name).toBe(role);
  });
});

describe("balance", () => {
  it("brings equal-loudness stems to equal faders and applies offsets", () => {
    const a = analyzeChannels([sine(sr, 3, 200, 0.3)], sr);
    const b = analyzeChannels([sine(sr, 3, 200, 0.03)], sr);
    expect(a.lufs - b.lufs).toBeCloseTo(20, 1);
    const auto = balanceLoudness([{ lufs: a.lufs, role: "other" }, { lufs: b.lufs, role: "other" }], { targetLufs: -23 });
    expect(a.lufs + auto[0]).toBeCloseTo(-23, 6);
    expect(b.lufs + auto[1]).toBeCloseTo(-23, 6);
    const withRole = balanceLoudness([{ lufs: a.lufs, role: "leadVocal" }], { targetLufs: -23, offsets: DEFAULT_ROLE_OFFSETS });
    expect(withRole[0] - auto[0]).toBeCloseTo(3, 6);
  });

  it("anchors so the loudest resulting fader is 0 dB and keeps trims", () => {
    const { faders, shiftDb } = anchorFaders([4, -2, 7], [0, 0, -1]);
    expect(Math.max(...faders.map((f, i) => f + [0, 0, -1][i]))).toBeCloseTo(0, 9);
    expect(shiftDb).toBeCloseTo(-6, 9);
    expect(faders[0]).toBeCloseTo(-2, 9);
  });

  it("predicts a mix peak that bounds the true peak of the sum", () => {
    const l = sine(sr, 1, 100, 0.4);
    const r = sine(sr, 1, 100, 0.4, Math.PI / 3);
    const al = analyzeChannels([l], sr);
    const ar = analyzeChannels([r], sr);
    const { upperDb, rssDb } = predictMixPeak([{ framePeaksDb: al.framePeaksDb, faderDb: 0 }, { framePeaksDb: ar.framePeaksDb, faderDb: 0 }]);
    const sum = new Float32Array(l.length);
    for (let i = 0; i < sum.length; i++) sum[i] = l[i] + r[i];
    let m = 0;
    for (const v of sum) m = Math.max(m, Math.abs(v));
    const trueDb = 20 * Math.log10(m);
    expect(upperDb).toBeGreaterThanOrEqual(trueDb - 0.01);
    expect(rssDb).toBeLessThanOrEqual(upperDb);
    expect(masterTrimFor(upperDb, -6)).toBeCloseTo(Math.min(0, -6 - upperDb), 9);
  });

  it("analysis carries loudness, peak, frame peaks and the ERB mean", () => {
    const a = analyzeChannels([sine(sr, 2, 1000, 0.5), sine(sr, 2, 1000, 0.5)], sr);
    expect(a.lufs).toBeCloseTo(-6.02, 0);
    expect(a.samplePeakDb).toBeCloseTo(-6.02, 1);
    expect(a.framePeaksDb.length).toBe(a.numFrames);
    expect(a.erb.meanDb.length).toBe(a.erb.numBands);
    let best = 0;
    for (let b = 0; b < a.erb.meanDb.length; b++) if (a.erb.meanDb[b] > a.erb.meanDb[best]) best = b;
    expect(a.erb.meanDb[best]).toBeGreaterThan(-8);
    expect(a.erb.meanDb[best]).toBeLessThan(-4);
  });
});
