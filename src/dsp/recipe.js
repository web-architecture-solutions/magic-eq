import { bandEdges, bandCentres, BAND_Q, NUM_BANDS } from "./bands.js";

// Plain JSON a user (or a DAW script) can apply with any parametric EQ.
export function buildRecipe({ stems, curves, timelines, knobs, sampleRate, measuredMakeupDb }) {
  const e = bandEdges();
  const c = bandCentres();
  const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
  return {
    version: 2,
    sampleRate,
    bandQ: round(BAND_Q, 3),
    bands: Array.from({ length: NUM_BANDS }, (_, b) => ({
      index: b,
      centreHz: round(c[b], 1),
      loHz: round(e[b], 1),
      hiHz: round(e[b + 1], 1),
    })),
    knobs: {
      ...knobs,
      pair: knobs.pair ?? null,
    },
    stems: stems.map((s, i) => ({
      name: s.name,
      faderDb: curves.faders[i],
      presenceDb: s.presenceDb ?? 0,
      rowScale: s.rowScale ?? 1,
      colScale: s.colScale ?? 1,
      level: s.level ?? 1,
      scoop: s.scoop ?? 1,
      mask: s.mask ? Array.from(s.mask) : undefined,
      enabled: s.enabled !== false,
      makeupDbEstimated: round(curves.makeupDb[i], 2),
      makeupDbMeasured:
        measuredMakeupDb && measuredMakeupDb[i] != null ? round(measuredMakeupDb[i], 2) : null,
      gains: Array.from(curves.G[i], (g) => round(g, 2)),
      gate: {
        transitions: s.analysis ? s.analysis.gate.transitions.map((t) => ({ t: round(t.t, 3), on: t.on })) : [],
        attackTau: knobs.attackTau,
        releaseTau: knobs.releaseTau,
        enabled: knobs.gateEnabled,
      },
      automation: timelines
        ? timelines[i].bands
            .map((events, b) => ({
              band: b,
              initialDb: round(timelines[i].initial[b], 2),
              events: events.map((ev) => ({ t: round(ev.t, 3), gainDb: round(ev.target, 2), tau: ev.tau })),
            }))
            .filter((x) => x.events.length > 0)
        : [],
    })),
  };
}
