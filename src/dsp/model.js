import { NUM_BANDS, ones, bandCentres } from "./bands.js";

// Every EQ curve is a pure function of the stems' spectra, their faders and a
// small set of knobs. Nothing is stored.
//
// v2: every depth knob is a contrast in dB. The flat part of a stem's cross
// cut (identical in every audible band) is removed because loudness make-up
// would cancel it anyway, and sources are combined per band (max by default)
// so adding a stem that competes nowhere changes nothing.

export const SILENT_DB = -60; // bands this far below the stem's peak get no cuts at all
export const KNEE = 0.75; // soft ceiling: linear to KNEE * maxCut, then tanh to maxCut

export const DEFAULT_KNOBS = Object.freeze({
  carveDb: 3, // cross-track cut depth (contrast), dB
  levelDb: 0, // self: damp the stem's own peaks, dB at the peak band
  scoopDb: 2, // self: cut the valleys between the stem's modes, dB at a full valley
  focus: 0.5, // 0: cut wherever another stem is comparable; 1: only where it clearly dominates
  maxCut: 6, // ceiling, dB (soft knee)
  floorDb: -24, // audible range: bands within this of the stem's peak define its contrast
  T: -12, // level reach: the level term only touches bands within T dB of the peak (< 0)
  scoopRange: 12, // scoop reach: a valley this deep (dB) gets the full scoop depth
  D: 12, // dominance range, dB, over which a cut ramps from 0 to full
  crossNorm: "max", // "max" | "sum" | "mean": how the other stems combine per band
  coupled: true, // per-stem level/scoop are multipliers on the global depths (else absolute dB)
  psycho: false, // loudness-weight band levels and spread maskers upward before the dominance test
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
  level: 1, // multiplier on levelDb when coupled, else dB
  scoop: 1, // multiplier on scoopDb when coupled, else dB
  rowScale: 1, // how hard this stem carves others (source weight)
  colScale: 1, // how much this stem accepts cuts (applied to the depth)
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

// A-weighting (dB) at a frequency, as a cheap equal-loudness stand-in.
export function aWeightDb(f) {
  const f2 = f * f;
  const ra = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2));
  return 20 * Math.log10(ra) + 2.0;
}

// Upward spread of masking across the 16 bands (dB): a masker in band b
// also counts in b+1 and b+2, and a little in b-1.
const SPREAD16 = { "-1": -25, 0: 0, 1: -10, 2: -20 };

let aWeightCache = null;
function aWeights() {
  if (!aWeightCache) aWeightCache = Float64Array.from(bandCentres(), (f) => aWeightDb(f));
  return aWeightCache;
}

// Psychoacoustic view of a stem's absolute band levels: loudness-weighted,
// and (for its role as a masker) spread upward.
export function psychoLevels(absDb, asMasker) {
  const A = aWeights();
  const w = new Float64Array(NUM_BANDS);
  for (let b = 0; b < NUM_BANDS; b++) w[b] = absDb[b] + A[b];
  if (!asMasker) return w;
  const out = new Float64Array(NUM_BANDS);
  for (let b = 0; b < NUM_BANDS; b++) {
    let p = 0;
    for (const [dStr, k] of Object.entries(SPREAD16)) {
      const src = b - Number(dStr);
      if (src < 0 || src >= NUM_BANDS) continue;
      p += Math.pow(10, (w[src] + k) / 10);
    }
    out[b] = p > 0 ? 10 * Math.log10(p) : -200;
  }
  return out;
}

export function headroomFor(knobs) {
  return (1 - clip(knobs.focus ?? 0.5, 0, 1)) * knobs.D;
}

// Source-side weight: how hard source j carves target i.
export function pairWeight(knobs, perTrack, source, target) {
  const override = knobs.pair?.[source]?.[target];
  const p = override == null ? 1 : override;
  return (perTrack[source].rowScale ?? 1) * p;
}

export function effectiveFaders(faderDb, knobs) {
  return faderDb.map((f) => (knobs.postFader ? 0 : f || 0));
}

// Soft ceiling for a cut u <= 0: linear until KNEE * M, then a tanh knee that
// asymptotes to M. Monotone, C1 at the knee, so turning a knob always moves it.
export function softClamp(u, M) {
  if (!(M > 0)) return 0;
  const x = -u;
  if (!(x > 0)) return 0;
  const k = KNEE * M;
  if (x <= k) return -x;
  return -(k + (M - k) * Math.tanh((x - k) / (M - k)));
}

// Fraction of "the others" dominating stem i in band b, given which sources
// are active. ctx comes from deriveCurves.
export function combineCross(ctx, i, b, state) {
  const { dom, weights, live, knobs } = ctx;
  const maskerDb = ctx.maskerDb || ctx.absDb;
  const maskeeDb = ctx.maskeeDb || ctx.absDb;
  const N = dom.length;
  const mode = knobs.crossNorm || "max";
  if (mode === "sum") {
    let p = 0;
    for (let j = 0; j < N; j++) {
      if (j === i || !live[j] || !state[j] || weights[i][j] <= 0) continue;
      if ((ctx.maskerS || ctx.S)[j][b] < SILENT_DB) continue;
      p += weights[i][j] * Math.pow(10, maskerDb[j][b] / 10);
    }
    if (p <= 0) return 0;
    return clip(10 * Math.log10(p) - maskeeDb[i][b] + ctx.H, 0, knobs.D) / knobs.D;
  }
  let acc = 0;
  let count = 0;
  for (let j = 0; j < N; j++) {
    if (j === i || !live[j]) continue;
    count++;
    if (!state[j]) continue;
    const v = dom[i][j][b];
    if (mode === "max") {
      if (v > acc) acc = v;
    } else {
      acc += v;
    }
  }
  return mode === "mean" && count > 0 ? acc / count : acc;
}

// Self term plus contrast-normalised cross term, through the soft ceiling.
export function finishGain(selfB, frac, mI, maskB, colScale, knobs) {
  const cross = -knobs.carveDb * colScale * maskB * Math.max(0, frac - mI);
  return softClamp(selfB + cross, knobs.maxCut);
}

export function deriveCurves(analyses, faderDb, perTrack, knobs) {
  const N = analyses.length;
  const faders = effectiveFaders(faderDb, knobs);
  const live = analyses.map((a, i) => !!a && !a.empty && perTrack[i].enabled !== false);
  const H = headroomFor(knobs);
  const T = Math.min(-1, knobs.T);
  const scoopRange = Math.max(1, knobs.scoopRange);

  const S = analyses.map((a) => (a ? a.S : new Float64Array(NUM_BANDS).fill(-200)));
  const absDb = analyses.map((a, i) => {
    const out = new Float64Array(NUM_BANDS).fill(-200);
    if (live[i]) for (let b = 0; b < NUM_BANDS; b++) out[b] = a.bandDb[b] + faders[i];
    return out;
  });
  const weights = [];
  for (let i = 0; i < N; i++) {
    weights.push(new Float64Array(N));
    for (let j = 0; j < N; j++) if (j !== i) weights[i][j] = pairWeight(knobs, perTrack, j, i);
  }
  const maskerDb = knobs.psycho ? absDb.map((a, i) => (live[i] ? psychoLevels(a, true) : a)) : absDb;
  const maskeeDb = knobs.psycho ? absDb.map((a, i) => (live[i] ? psychoLevels(a, false) : a)) : absDb;
  // A stem's masker view relative to its own peak decides where it is silent
  // as a masker (identical to S when psycho is off).
  const maskerS = maskerDb.map((m, i) => {
    if (!live[i]) return S[i];
    let peak = -Infinity;
    for (let b = 0; b < NUM_BANDS; b++) if (m[b] > peak) peak = m[b];
    return Float64Array.from(m, (v) => v - peak);
  });

  const self = [];
  const dom = [];
  const frac = [];
  const crossMin = new Float64Array(N);
  const flatRemovedDb = new Float64Array(N);
  const maskProd = [];
  const G = [];
  const unclamped = [];
  const makeupDb = new Float64Array(N);
  const effect = new Float64Array(N);
  const ceilingBands = new Uint8Array(N);
  const pairContribution = [];
  const audible = [];

  const ctx = { dom, weights, absDb, maskerDb, maskeeDb, maskerS, live, knobs, S, H };
  const allOn = new Uint8Array(N).fill(1);

  for (let i = 0; i < N; i++) {
    const s = new Float64Array(NUM_BANDS);
    const di = [];
    const fr = new Float64Array(NUM_BANDS);
    const mp = new Float64Array(NUM_BANDS);
    const g = new Float64Array(NUM_BANDS);
    const u = new Float64Array(NUM_BANDS);
    const aud = new Uint8Array(NUM_BANDS);
    self.push(s);
    dom.push(di);
    frac.push(fr);
    maskProd.push(mp);
    G.push(g);
    unclamped.push(u);
    audible.push(aud);
    pairContribution.push(new Float64Array(N));
    for (let j = 0; j < N; j++) di.push(new Float64Array(NUM_BANDS));
    if (!live[i]) continue;

    const a = analyses[i];
    const pt = perTrack[i];
    const mask = pt.mask || ones();
    const levelDepth = knobs.coupled ? knobs.levelDb * (pt.level ?? 1) : (pt.level ?? 0);
    const scoopDepth = knobs.coupled ? knobs.scoopDb * (pt.scoop ?? 1) : (pt.scoop ?? 0);

    for (let b = 0; b < NUM_BANDS; b++) {
      mp[b] = (knobs.mixMask?.[b] ?? 1) * (mask[b] ?? 1);
      if (a.S[b] < SILENT_DB) continue;
      aud[b] = a.S[b] >= knobs.floorDb ? 1 : 0;
      const lv = clip((a.S[b] - T) / -T, 0, 1);
      const sc = clip((a.E[b] - a.S[b]) / scoopRange, 0, 1);
      s[b] = -levelDepth * lv - scoopDepth * sc + 0;
    }
  }

  // Pairwise dominance needs every stem's absDb, so it is a second pass.
  for (let i = 0; i < N; i++) {
    if (!live[i]) continue;
    for (let j = 0; j < N; j++) {
      if (j === i || !live[j] || weights[i][j] <= 0) continue;
      const dij = dom[i][j];
      for (let b = 0; b < NUM_BANDS; b++) {
        if (S[i][b] < SILENT_DB || maskerS[j][b] < SILENT_DB) continue;
        dij[b] = weights[i][j] * (clip(maskerDb[j][b] - maskeeDb[i][b] + H, 0, knobs.D) / knobs.D);
      }
    }
  }

  for (let i = 0; i < N; i++) {
    if (!live[i]) continue;
    const a = analyses[i];
    const pt = perTrack[i];
    const fr = frac[i];
    let m = Infinity;
    let nAud = 0;
    for (let b = 0; b < NUM_BANDS; b++) {
      if (a.S[b] < SILENT_DB) continue;
      fr[b] = combineCross(ctx, i, b, allOn);
      if (audible[i][b]) {
        nAud++;
        if (fr[b] < m) m = fr[b];
      }
    }
    if (!Number.isFinite(m)) m = 0;
    crossMin[i] = m;
    flatRemovedDb[i] = knobs.carveDb * (pt.colScale ?? 1) * m;

    let gMax = -Infinity;
    let gMin = Infinity;
    for (let b = 0; b < NUM_BANDS; b++) {
      if (a.S[b] < SILENT_DB) continue;
      const cross = -knobs.carveDb * (pt.colScale ?? 1) * maskProd[i][b] * Math.max(0, fr[b] - m);
      unclamped[i][b] = self[i][b] + cross + 0;
      G[i][b] = softClamp(unclamped[i][b], knobs.maxCut) + 0;
      if (audible[i][b]) {
        if (G[i][b] > gMax) gMax = G[i][b];
        if (G[i][b] < gMin) gMin = G[i][b];
        if (unclamped[i][b] < -KNEE * knobs.maxCut) ceilingBands[i]++;
      }
    }
    effect[i] = nAud > 0 ? gMax - gMin : 0;
    for (let j = 0; j < N; j++) {
      if (j === i || !live[j]) continue;
      let acc = 0;
      for (let b = 0; b < NUM_BANDS; b++) if (audible[i][b]) acc += dom[i][j][b];
      pairContribution[i][j] = nAud > 0 ? acc / nAud : 0;
    }
    makeupDb[i] = knobs.loudnessMatch ? estimateMakeup(a.bandPower, G[i]) : 0;
  }

  const masking = maskingScore(analyses, faders, G, makeupDb, live);

  return {
    self,
    dom,
    frac,
    crossMin,
    flatRemovedDb,
    maskProd,
    weights,
    absDb,
    maskerDb,
    maskeeDb,
    maskerS,
    S,
    live,
    H,
    audible,
    G,
    unclamped,
    makeupDb,
    effect,
    ceilingBands,
    pairContribution,
    masking,
    faders,
  };
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
