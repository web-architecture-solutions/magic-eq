import { describe, it, expect } from "vitest";
import { buildGainTimelines, timelineValueAt, countEvents } from "../src/dsp/timeline.js";
import { deriveCurves, knobDefaults, perTrackDefaults, combineCross, finishGain } from "../src/dsp/model.js";
import { NUM_BANDS } from "../src/dsp/bands.js";
import { modeEnvelope } from "../src/dsp/envelope.js";
import { envelopeAt } from "../src/dsp/gate.js";

function spec(levels, transitions) {
  const bandDb = new Float64Array(NUM_BANDS).fill(-80);
  for (const [b, v] of Object.entries(levels)) bandDb[+b] = v;
  const peakDb = Math.max(...bandDb);
  const S = bandDb.map((v) => v - peakDb);
  return { bandDb, peakDb, S, E: modeEnvelope(S), bandPower: bandDb.map((v) => 10 ** (v / 10)), empty: false, gate: { transitions } };
}

const BASE = { carveDb: 3, levelDb: 0, scoopDb: 0, focus: 0.5, D: 12, maxCut: 4, floorDb: -24 };

describe("timeline", () => {
  const bass = spec({ 2: 0, 3: 0, 4: 0, 6: -12, 7: -12 }, [{ t: 0, on: true }, { t: 10, on: false }, { t: 20, on: true }]);
  const guitar = spec({ 2: -15, 6: 0, 7: 0 }, [{ t: 5, on: true }]);
  const perTrack = [perTrackDefaults(), perTrackDefaults()];
  const knobs = knobDefaults(BASE);
  const curves = deriveCurves([bass, guitar], [0, 0], perTrack, knobs);
  const tl = buildGainTimelines(curves, [bass, guitar], knobs, perTrack);

  it("emits one event per source transition on affected bands only", () => {
    expect(tl[1].initial[2]).toBeCloseTo(-3, 9);
    expect(tl[1].bands[2].map((e) => [e.t, e.target])).toEqual([[10, 0], [20, -3]]);
    expect(tl[1].bands[2][0].tau).toBe(knobs.releaseTau);
    expect(tl[1].bands[2][1].tau).toBe(knobs.attackTau);
    expect(tl[1].bands[3].length).toBe(0); // guitar silent there
    expect(tl[1].bands[6].length).toBe(0); // bass 12 dB down, no dominance
    expect(tl[1].initial[6]).toBe(0);
    expect(tl[0].initial[6]).toBe(0);
    expect(tl[0].bands[6].map((e) => [e.t, e.target])).toEqual([[5, -3]]);
    expect(tl[0].bands[7].map((e) => [e.t, e.target])).toEqual([[5, -3]]);
    expect(countEvents(tl)).toBe(2 + 1 + 1);
  });

  it("the all-on gated value equals the static curve", () => {
    const ctx = { dom: curves.dom, weights: curves.weights, absDb: curves.absDb, live: curves.live, knobs, S: curves.S, H: curves.H };
    const allOn = new Uint8Array(2).fill(1);
    for (let i = 0; i < 2; i++) {
      for (let b = 0; b < NUM_BANDS; b++) {
        if (curves.S[i][b] < -60) continue;
        const v = finishGain(curves.self[i][b], combineCross(ctx, i, b, allOn), curves.crossMin[i], curves.maskProd[i][b], 1, knobs);
        expect(v).toBeCloseTo(curves.G[i][b], 9);
      }
    }
  });

  it("replays setTargetAtTime semantics", () => {
    const ev = tl[1].bands[2];
    const init = tl[1].initial[2];
    expect(timelineValueAt(ev, init, 0)).toBe(-3);
    expect(timelineValueAt(ev, init, 9.99)).toBe(-3);
    expect(timelineValueAt(ev, init, 10.4)).toBeCloseTo(-3 * Math.exp(-1), 9);
    const bassEnv = (t) => envelopeAt(bass.gate.transitions, knobs.attackTau, knobs.releaseTau, t);
    for (const t of [10.2, 15, 20.1, 21]) expect(timelineValueAt(ev, init, t)).toBeCloseTo(-3 * bassEnv(t), 6);
  });

  it("is static when gating is off", () => {
    const off = buildGainTimelines(curves, [bass, guitar], { ...knobs, gateEnabled: false }, perTrack);
    expect(countEvents(off)).toBe(0);
    expect(Array.from(off[1].initial)).toEqual(Array.from(curves.G[1]));
  });

  it("a gated state below the contrast floor yields no cut and no duplicate events", () => {
    // Pad is contested half-way by b2 everywhere it plays (flat) and fully by
    // g2 in bands 6-7 once g2 enters at t = 3.
    const pad = spec({ 4: 0, 5: 0, 6: 0, 7: 0 }, [{ t: 0, on: true }]);
    const b2 = spec({ 4: 0, 5: 0 }, [{ t: 0, on: true }]);
    const g2 = spec({ 6: 6, 7: 6 }, [{ t: 3, on: true }]);
    const k = knobDefaults(BASE);
    const pt = [perTrackDefaults(), perTrackDefaults(), perTrackDefaults()];
    const cv = deriveCurves([pad, b2, g2], [0, 0, 0], pt, k);
    expect(cv.crossMin[0]).toBeCloseTo(0.5, 9);
    expect(cv.G[0][4]).toBe(0);
    expect(cv.G[0][6]).toBeCloseTo(-1.5, 9);
    const t = buildGainTimelines(cv, [pad, b2, g2], k, pt);
    expect(t[0].initial[6]).toBe(0);
    expect(t[0].bands[6].map((e) => [e.t, e.target])).toEqual([[3, -1.5]]);
    expect(t[0].bands[4].length).toBe(0);
    for (const tl of t) for (const evs of tl.bands) for (const e of evs) {
      expect(e.target).toBeLessThanOrEqual(0);
      expect(e.target).toBeGreaterThanOrEqual(-4);
    }
  });
});
