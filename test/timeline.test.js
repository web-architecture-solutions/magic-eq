import { describe, it, expect } from "vitest";
import { buildGainTimelines, timelineValueAt, countEvents } from "../src/dsp/timeline.js";
import { deriveCurves, knobDefaults, perTrackDefaults } from "../src/dsp/model.js";
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

describe("timeline", () => {
  const bass = spec({ 2: 0, 3: 0, 4: 0, 6: -12, 7: -12 }, [{ t: 0, on: true }, { t: 10, on: false }, { t: 20, on: true }]);
  const guitar = spec({ 2: -15, 6: 0, 7: 0 }, [{ t: 5, on: true }]);
  const perTrack = [perTrackDefaults(), perTrackDefaults()];
  const knobs = knobDefaults({ W: 3, maxCut: 4, stackNorm: 0 });
  const curves = deriveCurves([bass, guitar], [0, 0], perTrack, knobs);
  const tl = buildGainTimelines(curves, [bass, guitar], knobs);

  it("emits one event per source transition on affected bands only", () => {
    // Guitar band 2 is cut by the bass: on at 0 (initial), off at 10, on at 20.
    expect(tl[1].initial[2]).toBeCloseTo(-3, 9);
    expect(tl[1].bands[2].map((e) => [e.t, e.target])).toEqual([[10, 0], [20, -3]]);
    expect(tl[1].bands[2][0].tau).toBe(knobs.releaseTau);
    expect(tl[1].bands[2][1].tau).toBe(knobs.attackTau);
    // Guitar bands 3-4 are below the floor (-80) so nothing is scheduled there.
    expect(tl[1].bands[3].length).toBe(0);
    expect(tl[1].bands[4].length).toBe(0);
    // Guitar band 6: the bass is 12 dB down there, no cut.
    expect(tl[1].bands[6].length).toBe(0);
    expect(tl[1].initial[6]).toBe(0);
    // Bass bands 6-7 are cut by the guitar, which starts at 5: initial 0, then -3.
    expect(tl[0].initial[6]).toBe(0);
    expect(tl[0].bands[6].map((e) => [e.t, e.target])).toEqual([[5, -3]]);
    expect(tl[0].bands[7].map((e) => [e.t, e.target])).toEqual([[5, -3]]);
    expect(countEvents(tl)).toBe(2 + 1 + 1);
  });

  it("replays setTargetAtTime semantics", () => {
    const ev = tl[1].bands[2];
    const init = tl[1].initial[2];
    expect(timelineValueAt(ev, init, 0)).toBe(-3);
    expect(timelineValueAt(ev, init, 9.99)).toBe(-3);
    // After the release at t = 10, the cut decays toward 0 with tau 0.4.
    const v = timelineValueAt(ev, init, 10.4);
    expect(v).toBeCloseTo(-3 * Math.exp(-1), 9);
    // Equivalent to -3 * envelope of the bass alone.
    const bassEnv = (t) => envelopeAt(bass.gate.transitions, knobs.attackTau, knobs.releaseTau, t);
    for (const t of [10.2, 15, 20.1, 21]) {
      expect(timelineValueAt(ev, init, t)).toBeCloseTo(-3 * bassEnv(t), 6);
    }
  });

  it("is static when gating is off", () => {
    const off = buildGainTimelines(curves, [bass, guitar], { ...knobs, gateEnabled: false });
    expect(countEvents(off)).toBe(0);
    expect(Array.from(off[1].initial)).toEqual(Array.from(curves.G[1]));
  });

  it("clamps gated targets", () => {
    const pad = spec({ 4: 0, 5: 0, 6: 0, 7: 0 }, [{ t: 0, on: true }]);
    const b2 = spec({ 4: 0, 5: 0, 6: 0, 7: 0 }, [{ t: 0, on: true }]);
    const g2 = spec({ 4: 0, 5: 0, 6: 0, 7: 0 }, [{ t: 3, on: true }]);
    const k = knobDefaults({ W: 3, maxCut: 4, stackNorm: 0 });
    const pt = [perTrackDefaults(), perTrackDefaults(), perTrackDefaults()];
    const cv = deriveCurves([pad, b2, g2], [0, 0, 0], pt, k);
    const t = buildGainTimelines(cv, [pad, b2, g2], k);
    expect(t[0].initial[5]).toBeCloseTo(-1.5, 9);
    expect(t[0].bands[5][0].target).toBeCloseTo(-3, 9);
    for (const tl of t) for (const evs of tl.bands) for (const e of evs) {
      expect(e.target).toBeLessThanOrEqual(0);
      expect(e.target).toBeGreaterThanOrEqual(-4);
    }
  });
});
