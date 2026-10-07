import { describe, it, expect } from "vitest";
import { deriveCurves, knobDefaults, perTrackDefaults, softClamp, KNEE } from "../src/dsp/model.js";
import { NUM_BANDS } from "../src/dsp/bands.js";
import { modeEnvelope } from "../src/dsp/envelope.js";

export function spec(levels) {
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

const BASE = { carveDb: 3, levelDb: 0, scoopDb: 0, focus: 0.5, D: 12, maxCut: 4, floorDb: -24, T: -12, scoopRange: 12 };

function threeStems() {
  const bass = spec({ ...range(2, 4, 0), ...range(5, 7, -12) });
  const guitar = spec({ ...range(6, 10, 0), ...range(2, 4, -15) });
  const pad = spec(range(4, 12, 0));
  return [bass, guitar, pad];
}

function threeStemCase(knobOverrides = {}, faders = [0, 0, -20], perTrackOverrides = [{}, {}, {}]) {
  const knobs = knobDefaults({ ...BASE, ...knobOverrides });
  const perTrack = perTrackOverrides.map((o) => perTrackDefaults(o));
  return deriveCurves(threeStems(), faders, perTrack, knobs);
}
const BASS = 0, GTR = 1, PAD = 2;

describe("deriveCurves: three-stem case (max combine)", () => {
  const c = threeStemCase();

  it("cuts the guitar in bands 2-4 by the bass and nowhere else", () => {
    for (let b = 2; b <= 4; b++) expect(c.G[GTR][b]).toBeCloseTo(-3, 9);
    for (let b = 6; b <= 10; b++) expect(c.G[GTR][b]).toBe(0);
    expect(c.crossMin[GTR]).toBe(0);
    // The pad sits within headroom of the guitar's -15 dB body in band 4, but
    // max-combine keeps the bass's full dominance there.
    expect(c.dom[GTR][PAD][4]).toBeCloseTo(1 / 12, 9);
  });

  it("cuts the bass in 6-7 by the guitar, not in 2-5", () => {
    expect(c.G[BASS][6]).toBeCloseTo(-3, 9);
    expect(c.G[BASS][7]).toBeCloseTo(-3, 9);
    for (let b = 2; b <= 5; b++) expect(c.G[BASS][b]).toBe(0);
  });

  it("the quiet pad carves nobody in their main bands", () => {
    for (let b = 2; b <= 7; b++) expect(c.dom[BASS][PAD][b]).toBe(0);
    for (let b = 6; b <= 10; b++) expect(c.dom[GTR][PAD][b]).toBe(0);
  });

  it("the pad is carved across 4-10 and left alone in 11-12, with no clamping", () => {
    for (let b = 4; b <= 10; b++) expect(c.G[PAD][b]).toBeCloseTo(-3, 9);
    expect(c.G[PAD][11]).toBe(0);
    expect(c.G[PAD][12]).toBe(0);
    for (let i = 0; i < 3; i++) for (let b = 0; b < NUM_BANDS; b++) expect(c.unclamped[i][b]).toBeCloseTo(c.G[i][b], 9);
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

  it("reduces the masking score and reports effect per stem", () => {
    expect(c.masking.after).toBeLessThan(c.masking.before);
    expect(c.effect[GTR]).toBeCloseTo(3, 9);
    expect(c.effect[BASS]).toBeCloseTo(3, 9);
    expect(c.ceilingBands[PAD]).toBe(0);
  });
});

describe("deriveCurves: contrast normalisation", () => {
  it("a flat contest gives no cut at all", () => {
    const s = () => spec(range(4, 7, 0));
    const knobs = knobDefaults(BASE);
    const pt = [perTrackDefaults(), perTrackDefaults(), perTrackDefaults()];
    const c = deriveCurves([s(), s(), s()], [0, 0, 0], pt, knobs);
    for (let i = 0; i < 3; i++) {
      expect(c.crossMin[i]).toBeCloseTo(0.5, 9);
      expect(c.flatRemovedDb[i]).toBeCloseTo(1.5, 9);
      for (let b = 0; b < NUM_BANDS; b++) expect(c.G[i][b]).toBe(0);
      expect(c.makeupDb[i]).toBe(0);
    }
  });

  it("adding a stem that competes nowhere changes nothing", () => {
    const [bass, guitar] = threeStems();
    const hat = spec(range(13, 15, 0));
    const knobs = knobDefaults(BASE);
    const two = deriveCurves([bass, guitar], [0, 0], [perTrackDefaults(), perTrackDefaults()], knobs);
    const three = deriveCurves([bass, guitar, hat], [0, 0, 0], [perTrackDefaults(), perTrackDefaults(), perTrackDefaults()], knobs);
    for (let b = 0; b < NUM_BANDS; b++) {
      expect(three.G[BASS][b]).toBeCloseTo(two.G[BASS][b], 9);
      expect(three.G[GTR][b]).toBeCloseTo(two.G[GTR][b], 9);
    }
  });

  it("masks apply after the contrast floor", () => {
    const s = () => spec(range(4, 7, 0));
    const mask = new Array(NUM_BANDS).fill(1);
    mask[5] = 0;
    const knobs = knobDefaults(BASE);
    const pt = [perTrackDefaults({ mask }), perTrackDefaults(), perTrackDefaults()];
    const c = deriveCurves([s(), s(), s()], [0, 0, 0], pt, knobs);
    for (let b = 0; b < NUM_BANDS; b++) expect(c.G[0][b]).toBe(0);
    const g = threeStemCase({}, undefined, [{}, { mask }, {}]);
    expect(g.G[GTR][2]).toBeCloseTo(-3, 9);
    const m3 = new Array(NUM_BANDS).fill(1);
    m3[3] = 0;
    const g3 = threeStemCase({}, undefined, [{}, { mask: m3 }, {}]);
    expect(g3.G[GTR][3]).toBe(0);
    expect(g3.G[GTR][2]).toBeCloseTo(-3, 9);
    const mixMask = new Array(NUM_BANDS).fill(1);
    mixMask[2] = 0.5;
    expect(threeStemCase({ mixMask }).G[GTR][2]).toBeCloseTo(-1.5, 9);
  });

  it("mean and sum modes also give zero on a flat contest and cut the guitar", () => {
    for (const crossNorm of ["mean", "sum"]) {
      const c = threeStemCase({ crossNorm });
      expect(c.G[GTR][2]).toBeLessThan(-1);
      expect(c.G[GTR][8]).toBe(0);
      const s = () => spec(range(4, 7, 0));
      const flat = deriveCurves([s(), s(), s()], [0, 0, 0], [perTrackDefaults(), perTrackDefaults(), perTrackDefaults()], knobDefaults({ ...BASE, crossNorm }));
      for (let b = 0; b < NUM_BANDS; b++) expect(flat.G[0][b]).toBe(0);
    }
  });
});

describe("deriveCurves: self terms", () => {
  it("level damps the peaks within T of the top", () => {
    const c = threeStemCase({ levelDb: 3 });
    for (let b = 2; b <= 4; b++) expect(c.self[BASS][b]).toBeCloseTo(-3, 9);
    for (let b = 5; b <= 7; b++) expect(c.self[BASS][b]).toBe(0);
    const mid = deriveCurves([spec({ 3: 0, 5: -6 })], [0], [perTrackDefaults()], knobDefaults({ ...BASE, levelDb: 3 }));
    expect(mid.self[0][5]).toBeCloseTo(-1.5, 9);
    expect(mid.self[0][3]).toBeCloseTo(-3, 9);
  });

  it("scoop cuts valleys in proportion to their depth, up to scoopRange", () => {
    const c = threeStemCase({ scoopDb: 6 });
    expect(c.self[BASS][5]).toBeCloseTo(-3, 9); // valley 6 dB below the 0..-12 envelope
    for (const b of [2, 3, 4, 6, 7]) expect(c.self[BASS][b]).toBe(0);
    for (let b = 8; b < NUM_BANDS; b++) expect(c.self[BASS][b]).toBe(0); // silent bands get nothing
  });

  it("uncoupled mode uses per-stem absolute dB", () => {
    const c = threeStemCase({ coupled: false, levelDb: 0 }, undefined, [{ level: 3, scoop: 0 }, { level: 0, scoop: 0 }, { level: 0, scoop: 0 }]);
    expect(c.self[BASS][3]).toBeCloseTo(-3, 9);
    expect(c.self[GTR][8]).toBe(0);
    const coupled = threeStemCase({ coupled: true, levelDb: 2 }, undefined, [{ level: 1.5 }, {}, {}]);
    expect(coupled.self[BASS][3]).toBeCloseTo(-3, 9);
  });
});

describe("deriveCurves: knobs", () => {
  it("post-fader forces the pad to 0 dB; its uniform half-contest of the guitar is flat and removed", () => {
    const c = threeStemCase({ postFader: true });
    for (let b = 6; b <= 10; b++) expect(c.dom[GTR][PAD][b]).toBeCloseTo(0.5, 9);
    // Guitar: bands 2-4 fully contested (bass), 6-10 half (pad). The half is
    // the flat floor, so 6-10 get nothing and 2-4 keep the 0.5 of contrast.
    expect(c.crossMin[GTR]).toBeCloseTo(0.5, 9);
    expect(c.flatRemovedDb[GTR]).toBeCloseTo(1.5, 9);
    for (let b = 6; b <= 10; b++) expect(c.G[GTR][b]).toBe(0);
    for (let b = 2; b <= 4; b++) expect(c.G[GTR][b]).toBeCloseTo(-1.5, 9);
    expect(c.faders).toEqual([0, 0, 0]);
  });

  it("all depths at zero give no cuts and no make-up", () => {
    const c = threeStemCase({ carveDb: 0, levelDb: 0, scoopDb: 0 });
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

  it("rowScale 0 removes the bass's dominance over everyone", () => {
    const c = threeStemCase({}, undefined, [{ rowScale: 0 }, {}, {}]);
    for (let b = 0; b < NUM_BANDS; b++) {
      expect(c.dom[GTR][BASS][b]).toBe(0);
      expect(c.dom[PAD][BASS][b]).toBe(0);
    }
    expect(c.G[GTR][2]).toBe(0);
    expect(c.G[GTR][3]).toBe(0);
    expect(c.G[BASS][6]).toBeCloseTo(-3, 9);
  });

  it("a pair override scales one ordered pair only", () => {
    const pair = [[null, 0.5, null], [null, null, null], [null, null, null]];
    const c = threeStemCase({ pair });
    expect(c.G[GTR][3]).toBeCloseTo(-1.5, 9);
    expect(c.G[PAD][5]).toBeCloseTo(-3, 9);
  });

  it("focus trades selectivity: 1 removes the pad sliver, 0 lets the pad touch the bass harmonics", () => {
    const tight = threeStemCase({ focus: 1 });
    expect(tight.dom[GTR][PAD][4]).toBe(0);
    expect(tight.G[BASS][6]).toBeCloseTo(-3, 9);
    const broad = threeStemCase({ focus: 0 });
    expect(broad.dom[BASS][PAD][5]).toBeCloseTo(1 / 3, 9);
    expect(broad.G[BASS][5]).toBeCloseTo(-1, 9);
  });

  it("empty or disabled stems neither carve nor get carved", () => {
    const c = threeStemCase({}, undefined, [{}, { enabled: false }, {}]);
    for (let b = 0; b < NUM_BANDS; b++) {
      expect(c.G[GTR][b]).toBe(0);
      expect(c.G[BASS][b]).toBe(0);
    }
  });
});

describe("softClamp", () => {
  it("is linear below the knee, bounded by maxCut, and monotone", () => {
    expect(softClamp(-3, 4)).toBe(-3);
    expect(softClamp(0, 4)).toBe(0);
    expect(softClamp(-12, 4)).toBeLessThan(-3.99);
    expect(softClamp(-12, 4)).toBeGreaterThan(-4);
    const v35 = softClamp(-3.5, 4);
    expect(v35).toBeLessThan(-3);
    expect(v35).toBeGreaterThan(-4);
    expect(softClamp(-4, 4)).toBeLessThan(v35);
    expect(softClamp(-5, 4)).toBeLessThan(softClamp(-4, 4));
    expect(softClamp(-1, 0)).toBe(0);
    expect(KNEE).toBe(0.75);
    const c = threeStemCase({ levelDb: 12 });
    expect(c.unclamped[BASS][3]).toBeCloseTo(-12, 9);
    expect(c.G[BASS][3]).toBeCloseTo(-4, 3);
    expect(c.ceilingBands[BASS]).toBe(3);
  });
});
