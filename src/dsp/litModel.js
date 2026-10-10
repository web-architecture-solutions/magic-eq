// The EQ model: the published cross-adaptive methods, as closely as the
// accessible sources allow. Every parameter carries a provenance tag in
// src/ui/litParams.js: documented (stated in the paper or a citing source),
// inferred (follows from the method but no value given), or unverified (a
// choice we had to make).
//
// Stage A, masking reduction (Hafezi & Reiss 2015, offline system): masking
// of maskee j by masker i in band b when the masker is louder there AND the
// band is essential for the maskee and nonessential for the masker. The
// masker is attenuated where it dominates; at most K occurrences per track;
// peaking filters with fixed Q; gain taken from the masking value, scaled
// by the one user parameter.
//
// Stage B, spectral balance (Perez-Gonzalez & Reiss 2009), off by default:
// perceptually weighted per-band loudness accumulated over the track; each
// channel's band gain pushes its band toward the cross-channel average.
//
// Stage C, high-pass by role (De Man & Reiss 2013 rule family): a high-pass
// on everything that is not a low-frequency instrument.

import { NUM_BANDS, bandCentres } from "./bands.js";
import { aWeightDb, estimateMakeup, SILENT_DB, clip } from "./common.js";

const LOW_ROLES = new Set(["kick", "bass", "drums", "room"]);
const ABSENT = -200;

let aCache = null;
function weights(kind) {
  if (kind !== "a") return new Float64Array(NUM_BANDS);
  if (!aCache) aCache = Float64Array.from(bandCentres(), (f) => aWeightDb(f));
  return aCache;
}

export function hpfForRole(role, knobs) {
  if (!knobs.litHpf) return 0;
  return LOW_ROLES.has(role) ? 0 : knobs.litHpfHz;
}

// analyses[i]: stem analysis (or null); faderDb[i]: dB; roles[i]: role key.
export function deriveLitCurves(analyses, faderDb, knobs, roles = []) {
  const N = analyses.length;
  const faders = faderDb.map((f) => (knobs.postFader ? 0 : f || 0));
  const live = analyses.map((a) => !!a && !a.empty);
  const w = weights(knobs.litBalanceWeighting);
  const amount = clip(knobs.litAmount ?? 0.5, 0, 1);
  const maxCut = Math.max(0, knobs.litMaxCut ?? 12);
  const maxBoost = knobs.litBalanceBoosts ? Math.max(0, knobs.litMaxBoost ?? 6) : 0;

  // Perceptually weighted band loudness at mix level.
  const L = analyses.map((a, i) => {
    const out = new Float64Array(NUM_BANDS).fill(ABSENT);
    if (!live[i]) return out;
    for (let b = 0; b < NUM_BANDS; b++) if (a.S[b] >= SILENT_DB) out[b] = a.bandDb[b] + faders[i] + w[b];
    return out;
  });
  const S = analyses.map((a) => (a ? a.S : new Float64Array(NUM_BANDS).fill(ABSENT)));
  const essential = analyses.map((a, i) => {
    const e = new Uint8Array(NUM_BANDS);
    if (live[i]) for (let b = 0; b < NUM_BANDS; b++) e[b] = a.S[b] >= -knobs.litEssentialDb ? 1 : 0;
    return e;
  });
  const audible = analyses.map((a, i) => {
    const e = new Uint8Array(NUM_BANDS);
    if (live[i]) for (let b = 0; b < NUM_BANDS; b++) e[b] = a.S[b] >= knobs.floorDb ? 1 : 0;
    return e;
  });
  const present = (i, b) => L[i][b] > ABSENT / 2;

  // Spectral balance toward the cross-channel average per band.
  const levelTerm = analyses.map(() => new Float64Array(NUM_BANDS));
  if (knobs.litBalance) {
    for (let b = 0; b < NUM_BANDS; b++) {
      let sum = 0;
      let n = 0;
      for (let i = 0; i < N; i++) if (live[i] && present(i, b)) {
        sum += L[i][b];
        n++;
      }
      if (n < 2) continue;
      const avg = sum / n;
      for (let i = 0; i < N; i++) {
        if (!live[i] || !present(i, b)) continue;
        levelTerm[i][b] = clip(amount * (avg - L[i][b]), -maxCut, maxBoost) + 0;
      }
    }
  }

  // Masking occurrences: masker i over maskee j in band b. dom[j][i][b] is
  // the masking value (dB by which the masker is louder).
  const dom = analyses.map(() => analyses.map(() => new Float64Array(NUM_BANDS)));
  const occurrences = []; // { i: masker, j: maskee, b, m, selected }
  if (knobs.litMasking) {
    for (let i = 0; i < N; i++) {
      if (!live[i]) continue;
      for (let j = 0; j < N; j++) {
        if (j === i || !live[j]) continue;
        for (let b = 0; b < NUM_BANDS; b++) {
          if (!essential[j][b] || essential[i][b]) continue;
          if (!present(i, b) || !present(j, b)) continue;
          const m = L[i][b] - L[j][b];
          if (m <= 0) continue;
          dom[j][i][b] = m;
          occurrences.push({ i, j, b, m, selected: false });
        }
      }
    }
  }
  // The strongest K occurrences per cut target, one filter per band.
  const crossTerm = analyses.map(() => new Float64Array(NUM_BANDS));
  const target = (o) => (knobs.litCutTarget === "maskee" ? o.j : o.i);
  const perTarget = new Map();
  for (const o of occurrences) {
    const t = target(o);
    if (!perTarget.has(t)) perTarget.set(t, []);
    perTarget.get(t).push(o);
  }
  for (const [t, list] of perTarget) {
    list.sort((a, b) => b.m - a.m);
    const seen = new Set();
    for (const o of list) {
      if (seen.size >= knobs.litTopK) break;
      if (seen.has(o.b)) continue;
      seen.add(o.b);
      o.selected = true;
      crossTerm[t][o.b] = Math.min(crossTerm[t][o.b], -amount * o.m);
    }
  }

  const G = [];
  const unclamped = [];
  const makeupDb = new Float64Array(N);
  const effect = new Float64Array(N);
  const ceilingBands = new Uint8Array(N);
  const pairContribution = analyses.map(() => new Float64Array(N));
  const hpfHz = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    const g = new Float64Array(NUM_BANDS);
    const u = new Float64Array(NUM_BANDS);
    G.push(g);
    unclamped.push(u);
    if (!live[i]) continue;
    hpfHz[i] = hpfForRole(roles[i], knobs);
    let gMax = -Infinity;
    let gMin = Infinity;
    for (let b = 0; b < NUM_BANDS; b++) {
      u[b] = levelTerm[i][b] + crossTerm[i][b] + 0;
      g[b] = clip(u[b], -maxCut, maxBoost) + 0;
      if (audible[i][b]) {
        if (g[b] > gMax) gMax = g[b];
        if (g[b] < gMin) gMin = g[b];
        if (u[b] < -maxCut) ceilingBands[i]++;
      }
    }
    effect[i] = Number.isFinite(gMax) ? gMax - gMin : 0;
    // How much each other stem masks this one, over its audible bands,
    // scaled by the max cut: the masking matrix.
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      let acc = 0;
      let n = 0;
      for (let b = 0; b < NUM_BANDS; b++) if (audible[i][b]) {
        acc += Math.min(1, dom[i][j][b] / Math.max(1, maxCut));
        n++;
      }
      pairContribution[i][j] = n > 0 ? acc / n : 0;
    }
    makeupDb[i] = knobs.litMakeup ? estimateMakeup(analyses[i].bandPower, g) : 0;
  }

  // The paper's kind of objective: total masking (dB-sum of occurrences),
  // before and after the EQ.
  const litMasking = { before: 0, after: 0 };
  for (const o of occurrences) {
    litMasking.before += o.m;
    const after = o.m + G[o.i][o.b] - G[o.j][o.b] + (makeupDb[o.i] - makeupDb[o.j]);
    litMasking.after += Math.max(0, after);
  }

  return {
    levelTerm,
    crossTerm,
    dom,
    G,
    unclamped,
    makeupDb,
    effect,
    ceilingBands,
    pairContribution,
    audible,
    live,
    S,
    faders,
    hpfHz,
    bandQ: knobs.litQ,
    litMasking,
    occurrences,
  };
}
