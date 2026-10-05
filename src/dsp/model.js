import { NUM_BANDS, ones } from "./bands.js";

// The whole idea lives here: every EQ curve is a pure function of the stems'
// spectra, their faders, and a small set of knobs. Nothing is stored.

export const DEFAULT_KNOBS = Object.freeze({
  W: 3, // global cross-cut depth, dB
  T: -12, // level threshold, dB below the stem's own peak (<= 0)
  H: 6, // dominance headroom, dB
  D: 12, // dominance range, dB (full cut once j exceeds i by D - H)
  maxCut: 6, // clamp, dB
  stackNorm: 0.5, // divide the cross sum by n^stackNorm
  floorDb: -40, // no cross cuts where the target is below this (rel. own peak)
  mixMask: ones(),
  pair: null, // [source][target] overrides, null or 1 = no override
  attackTau: 0.15,
  releaseTau: 0.4,
  gateDb: -50,
  gateEnabled: true,
  postFader: false,
  loudnessMatch: true,
});

export const DEFAULT_PER_TRACK = Object.freeze({
  alpha: 0, // level: damp the peaks
  beta: 0, // scoop: cut the valleys between modes
  rowScale: 1, // how hard this stem carves others
  colScale: 1, // how much this stem accepts cuts
  mask: ones(),
  enabled: true,
});

export function perTrackDefaults(overrides = {}) {
  return { ...DEFAULT_PER_TRACK, mask: ones(), ...overrides };
}

export function knobDefaults(overrides = {}) {
  return { ...DEFAULT_KNOBS, mixMask: ones(), ...overrides };
}

function clip(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

export function pairWeight(knobs, perTrack, source, target) {
  const override = knobs.pair?.[source]?.[target];
  const p = override == null ? 1 : override;
  return knobs.W * perTrack[source].rowScale * perTrack[target].colScale * p;
}

export function effectiveFaders(faderDb, knobs) {
  return faderDb.map((f) => (knobs.postFader ? 0 : f || 0));
}

export function deriveCurves(analyses, faderDb, perTrack, knobs) {
  const N = analyses.length;
  const faders = effectiveFaders(faderDb, knobs);
  const live = analyses.map(
    (a, i) => !!a && !a.empty && perTrack[i].enabled !== false
  );

  const self = [];
  const cross = [];
  const nContrib = [];
  const G = [];
  const unclampedSum = [];
  const makeupDb = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    const s = new Float64Array(NUM_BANDS);
    const ci = [];
    const n = new Uint8Array(NUM_BANDS);
    const g = new Float64Array(NUM_BANDS);
    const u = new Float64Array(NUM_BANDS);
    self.push(s);
    cross.push(ci);
    nContrib.push(n);
    G.push(g);
    unclampedSum.push(u);
    for (let j = 0; j < N; j++) ci.push(new Float64Array(NUM_BANDS));
    if (!live[i]) continue;

    const a = analyses[i];
    const pt = perTrack[i];
    const mask = pt.mask || ones();
    for (let b = 0; b < NUM_BANDS; b++) {
      const level = Math.max(0, a.S[b] - knobs.T);
      const valley = a.E[b] - a.S[b];
      s[b] = -(pt.alpha || 0) * level - (pt.beta || 0) * valley + 0;
    }

    for (let j = 0; j < N; j++) {
      if (j === i || !live[j]) continue;
      const w = pairWeight(knobs, perTrack, j, i);
      if (w === 0) continue;
      const aj = analyses[j];
      const cij = ci[j];
      for (let b = 0; b < NUM_BANDS; b++) {
        if (a.S[b] < knobs.floorDb) continue;
        const Ai = a.bandDb[b] + faders[i];
        const Aj = aj.bandDb[b] + faders[j];
        const dom = clip(Aj - Ai + knobs.H, 0, knobs.D) / knobs.D;
        if (dom <= 0) continue;
        const v = -w * dom * (knobs.mixMask?.[b] ?? 1) * (mask[b] ?? 1);
        if (v === 0) continue;
        cij[b] = v;
        n[b]++;
      }
    }

    for (let b = 0; b < NUM_BANDS; b++) {
      let sum = 0;
      for (let j = 0; j < N; j++) sum += ci[j][b];
      const norm = n[b] > 0 ? Math.pow(n[b], knobs.stackNorm) : 1;
      u[b] = s[b] + sum / norm + 0;
      g[b] = clip(u[b], -knobs.maxCut, 0) + 0;
    }

    makeupDb[i] = knobs.loudnessMatch ? estimateMakeup(a.bandPower, g) : 0;
  }

  const masking = maskingScore(analyses, faders, G, makeupDb, live);

  return { self, cross, nContrib, G, unclampedSum, makeupDb, masking, faders };
}

// Gain (dB) that restores the stem's band-weighted power after the cuts.
export function estimateMakeup(bandPower, G) {
  let before = 0;
  let after = 0;
  for (let b = 0; b < bandPower.length; b++) {
    before += bandPower[b];
    after += bandPower[b] * Math.pow(10, G[b] / 10);
  }
  if (before <= 0 || after <= 0) return 0;
  return -10 * Math.log10(after / before) + 0;
}

// Crude overlap score: sum over pairs and bands of min(P_i, P_j) at mix level.
export function maskingScore(analyses, faders, G, makeupDb, live) {
  const N = analyses.length;
  let before = 0;
  let after = 0;
  for (let i = 0; i < N; i++) {
    if (live && !live[i]) continue;
    for (let j = i + 1; j < N; j++) {
      if (live && !live[j]) continue;
      for (let b = 0; b < NUM_BANDS; b++) {
        const pi = analyses[i].bandPower[b] * Math.pow(10, faders[i] / 10);
        const pj = analyses[j].bandPower[b] * Math.pow(10, faders[j] / 10);
        before += Math.min(pi, pj);
        const qi = pi * Math.pow(10, (G[i][b] + makeupDb[i]) / 10);
        const qj = pj * Math.pow(10, (G[j][b] + makeupDb[j]) / 10);
        after += Math.min(qi, qj);
      }
    }
  }
  const ratioDb = before > 0 && after > 0 ? 10 * Math.log10(after / before) : 0;
  return { before, after, ratioDb };
}
