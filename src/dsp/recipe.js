import { bandEdges, bandCentres, NUM_BANDS } from "./bands.js";

// Plain JSON a user (or a DAW script) can apply with any parametric EQ: per
// stem, a fader, an optional high-pass, 16 peaking bands at one Q, and a
// make-up gain.
export function buildRecipe({ stems, curves, knobs, sampleRate, measuredMakeupDb, masterTrimDb = 0 }) {
  const e = bandEdges();
  const c = bandCentres();
  const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
  const eqKnobs = Object.fromEntries(Object.entries(knobs).filter(([k]) => k.startsWith("lit") || ["targetLufs", "roleOffsets", "postFader", "floorDb", "gateDb"].includes(k)));
  return {
    version: 3,
    sampleRate,
    method: "Hafezi & Reiss 2015 masking reduction; De Man & Reiss 2013 high-pass by role; optional Perez-Gonzalez & Reiss 2009 spectral balance",
    bandQ: round(curves.bandQ, 3),
    highpass: { type: "Butterworth, 2nd order", slopeDbPerOct: 12 },
    masterTrimDb: round(masterTrimDb, 2),
    bands: Array.from({ length: NUM_BANDS }, (_, b) => ({
      index: b,
      centreHz: round(c[b], 1),
      loHz: round(e[b], 1),
      hiHz: round(e[b + 1], 1),
    })),
    knobs: eqKnobs,
    stems: stems.map((s, i) => ({
      name: s.name,
      role: s.role ?? "other",
      lufs: s.analysis && Number.isFinite(s.analysis.lufs) ? round(s.analysis.lufs, 2) : null,
      faderDb: round(curves.faders[i], 2),
      autoFaderDb: s.autoFaderDb ?? null,
      trimDb: s.trimDb ?? 0,
      hpfHz: curves.hpfHz ? curves.hpfHz[i] : 0,
      gains: Array.from(curves.G[i], (g) => round(g, 2)),
      makeupDbEstimated: round(curves.makeupDb[i], 2),
      makeupDbMeasured: measuredMakeupDb && measuredMakeupDb[i] != null ? round(measuredMakeupDb[i], 2) : null,
    })),
  };
}
