import { describe, it, expect } from "vitest";
import { deriveCurves, knobDefaults, perTrackDefaults } from "../src/dsp/model.js";
import { NUM_BANDS } from "../src/dsp/bands.js";
import { modeEnvelope } from "../src/dsp/envelope.js";

function spec(levels) {
  const bandDb = new Float64Array(NUM_BANDS).fill(-80);
  for (const [b, v] of Object.entries(levels)) bandDb[+b] = v;
  const peakDb = Math.max(...bandDb);
  const S = bandDb.map((v) => v - peakDb);
  const bandPower = bandDb.map((v) => Math.pow(10, v / 10));
  return { bandDb, peakDb, S, E: modeEnvelope(S), bandPower, empty: false, gate: { transitions: [] } };
}

const range = (lo, hi, v) => {
  const o = {};
  for (let b = lo; b <= hi; b++) o[b] = v;
  return o;
};

function threeStemCase(knobOverrides = {}, faders = [0, 0, -20], perTrackOverrides = [{}, {}, {}]) {
  const bass = spec({ ...range(2, 4, 0), ...range(5, 7, -12) });
  const guitar = spec({ ...range(6, 10, 0), ...range(2, 4, -15) });
  const pad = spec(range(4, 12, 0));
  const knobs = knobDefaults({ W: 3, T: -12, H: 6, D: 12, maxCut: 4, stackNorm: 0, floorDb: -40, ...knobOverrides });
  const perTrack = perTrackOverrides.map((o) => perTrackDefaults(o));
  return deriveCurves([bass, guitar, pad], faders, perTrack, knobs);
}
const BASS = 0, GTR = 1, PAD = 2;

describe("deriveCurves: three-stem case", () => {
  const c = threeStemCase();

  it("cuts the guitar in bands 2-4 by the bass and nowhere else", () => {
    for (let b = 2; b <= 4; b++) expect(c.cross[GTR][BASS][b]).toBeCloseTo(-3, 9);
    expect(c.G[GTR][2]).toBeCloseTo(-3, 9);
    expect(c.G[GTR][3]).toBeCloseTo(-3, 9);
    // Band 4: the pad (-20) sits within H of the guitar's -15 dB body, so it
    // adds a sliver (-3 * 1/12) on top of the bass's cut.
    expect(c.G[GTR][4]).toBeCloseTo(-3.25, 9);
    for (let b = 6; b <= 10; b++) expect(c.G[GTR][b]).toBe(0);
    for (let b = 0; b < NUM_BANDS; b++) expect(c.G[GTR][b]).toBeLessThanOrEqual(0);
  });

  it("cuts the bass in 6-7 by the guitar, not in 5 or 2-4", () => {
    expect(c.G[BASS][6]).toBeCloseTo(-3, 9);
    expect(c.G[BASS][7]).toBeCloseTo(-3, 9);
    expect(c.G[BASS][5]).toBe(0);
    for (let b = 2; b <= 4; b++) expect(c.G[BASS][b]).toBe(0);
  });

  it("the quiet pad carves nobody, except the headroom sliver in guitar band 4", () => {
    for (let b = 0; b < NUM_BANDS; b++) expect(c.cross[BASS][PAD][b]).toBe(0);
    for (let b = 0; b < NUM_BANDS; b++) {
      if (b === 4) expect(c.cross[GTR][PAD][b]).toBeCloseTo(-0.25, 9);
      else expect(c.cross[GTR][PAD][b]).toBe(0);
    }
  });

  it("without the floor, the pad only carves bands where the target is silent", () => {
    const nf = threeStemCase({ floorDb: -200 });
    for (const i of [BASS, GTR]) {
      for (let b = 0; b < NUM_BANDS; b++) {
        const target = i === BASS ? (b >= 2 && b <= 7) : ((b >= 2 && b <= 4) || (b >= 6 && b <= 10));
        if (i === GTR && b === 4) continue; // headroom sliver, see above
        if (target) expect(nf.cross[i][PAD][b]).toBe(0);
        else if (b >= 4 && b <= 12) expect(nf.cross[i][PAD][b]).toBeLessThan(0);
      }
    }
  });

  it("the pad gets carved and stacked cuts clamp at maxCut", () => {
    // Band 4: bass (-3) plus the guitar's -15 dB body (11/12 of -3) stack past the clamp.
    expect(c.unclampedSum[PAD][4]).toBeCloseTo(-5.75, 9);
    expect(c.G[PAD][4]).toBeCloseTo(-4, 9);
    expect(c.G[PAD][5]).toBeCloseTo(-3, 9); // bass harmonics only (-12 + 20 + 6 -> full)
    for (let b = 8; b <= 10; b++) expect(c.G[PAD][b]).toBeCloseTo(-3, 9);
    for (let b = 6; b <= 7; b++) {
      expect(c.unclampedSum[PAD][b]).toBeCloseTo(-6, 9);
      expect(c.G[PAD][b]).toBeCloseTo(-4, 9);
      expect(c.nContrib[PAD][b]).toBe(2);
    }
    expect(c.G[PAD][11]).toBe(0);
    expect(c.G[PAD][12]).toBe(0);
  });

  it("never boosts, never exceeds maxCut, and makes up only where cut", () => {
    for (let i = 0; i < 3; i++) {
      let anyCut = false;
      for (let b = 0; b < NUM_BANDS; b++) {
        expect(c.G[i][b]).toBeLessThanOrEqual(0);
        expect(c.G[i][b]).toBeGreaterThanOrEqual(-4);
        if (c.G[i][b] < 0) anyCut = true;
      }
      expect(c.makeupDb[i]).toBeGreaterThanOrEqual(0);
      if (anyCut) expect(c.makeupDb[i]).toBeGreaterThan(0);
    }
  });

  it("reduces the masking score", () => {
    expect(c.masking.after).toBeLessThan(c.masking.before);
  });

  it("stackNorm 1 halves the two-source sum", () => {
    const n = threeStemCase({ stackNorm: 1 });
    expect(n.G[PAD][6]).toBeCloseTo(-3, 9);
  });
});

describe("deriveCurves: knobs", () => {
  it("post-fader forces the pad to 0 dB so it carves the guitar at half depth", () => {
    const c = threeStemCase({ postFader: true });
    for (let b = 6; b <= 10; b++) expect(c.cross[GTR][PAD][b]).toBeCloseTo(-1.5, 9);
    expect(c.faders).toEqual([0, 0, 0]);
  });

  it("W = 0 gives no cuts and no make-up", () => {
    const c = threeStemCase({ W: 0 });
    for (let i = 0; i < 3; i++) {
      expect(c.makeupDb[i]).toBe(0);
      for (let b = 0; b < NUM_BANDS; b++) expect(c.G[i][b]).toBe(0);
    }
  });

  it("colScale 0 leaves the guitar uncut while it still cuts the bass", () => {
    const c = threeStemCase({}, undefined, [{}, { colScale: 0 }, {}]);
    for (let b = 0; b < NUM_BANDS; b++) expect(c.G[GTR][b]).toBe(0);
    expect(c.G[BASS][6]).toBeCloseTo(-3, 9);
  });

  it("rowScale 0 removes the bass's cuts on everyone", () => {
    const c = threeStemCase({}, undefined, [{ rowScale: 0 }, {}, {}]);
    for (let b = 0; b < NUM_BANDS; b++) {
      expect(c.cross[GTR][BASS][b]).toBe(0);
      expect(c.cross[PAD][BASS][b]).toBe(0);
    }
    expect(c.G[BASS][6]).toBeCloseTo(-3, 9);
  });

  it("a pair override scales one ordered pair only", () => {
    const pair = [[null, 0.5, null], [null, null, null], [null, null, null]];
    const c = threeStemCase({ pair });
    expect(c.cross[GTR][BASS][3]).toBeCloseTo(-1.5, 9);
    expect(c.cross[PAD][BASS][4]).toBeCloseTo(-3, 9);
  });

  it("masks lock bands at track and mix level", () => {
    const mask = new Array(NUM_BANDS).fill(1);
    mask[3] = 0;
    const c = threeStemCase({}, undefined, [{}, { mask }, {}]);
    expect(c.G[GTR][3]).toBe(0);
    expect(c.G[GTR][2]).toBeCloseTo(-3, 9);
    const mixMask = new Array(NUM_BANDS).fill(1);
    mixMask[2] = 0.5;
    const m = threeStemCase({ mixMask });
    expect(m.G[GTR][2]).toBeCloseTo(-1.5, 9);
  });

  it("self EQ: alpha levels peaks, beta scoops valleys", () => {
    const c = threeStemCase({ W: 0 }, undefined, [{ alpha: 0.5 }, { beta: 0.5 }, {}]);
    expect(c.self[BASS][3]).toBeCloseTo(-6, 9);
    expect(c.self[BASS][5]).toBe(0);
    expect(c.self[GTR][5]).toBeLessThan(0);
    expect(c.self[GTR][8]).toBe(0);
  });

  it("empty or disabled stems neither carve nor get carved", () => {
    const c = threeStemCase({}, undefined, [{}, { enabled: false }, {}]);
    for (let b = 0; b < NUM_BANDS; b++) {
      expect(c.G[GTR][b]).toBe(0);
      expect(c.G[BASS][b]).toBe(0);
    }
  });
});
