// The "literature" flow: a parallel EQ model that follows the published
// cross-adaptive methods as closely as the accessible sources allow. Every
// parameter carries a provenance tag in src/ui/litParams.js: documented
// (stated in the paper or a citing source), inferred (follows from the
// method but no value given), or unverified (a choice we had to make).
//
// Stage A, spectral balance (Perez-Gonzalez & Reiss 2009): perceptually
// weighted per-band loudness accumulated over the track; each channel's band
// gain pushes its band toward the cross-channel average.
//
// Stage B, masking reduction (Hafezi & Reiss 2015, offline system): masking
// of maskee j by masker i in band b when the masker is louder there AND the
// band is essential for the maskee and nonessential for the masker. The
// masker is attenuated where it dominates; at most K occurrences per track;
// peaking filters with fixed Q; gain taken from the masking value, scaled
// by the one user parameter.
//
// Stage C, high-pass by role (De Man & Reiss rule family): a high-pass on
// everything that is not a low-frequency instrument.
//
// Output has the same shape as deriveCurves so the engine, the plots, the
// matrix and the export consume it unchanged.

import { NUM_BANDS, bandCentres, ones } from "./bands.js";
import { aWeightDb, estimateMakeup, maskingScore, SILENT_DB } from "./model.js";

export const LIT_DEFAULTS = Object.freeze({
  flow: "magic", // "magic" | "lit"
  litAmount: 0.5, // the one user parameter (Hafezi & Reiss offline system)
  litBalance: false, // stage A: a separate system (2009); off keeps the 2015 system alone
  litBalanceWeighting: "a", // "a" (approximates ISO 226 at 40 phon) | "none"
  litBalanceBoosts: false, // allow boosts toward the average
  litMasking: true, // stage B on
  litCutTarget: "masker", // "masker" (paper) | "maskee" (Magic's direction)
  litEssentialDb: 12, // band is essential when within this of the track's peak (unverified)
  litTopK: 3, // masking occurrences per track (documented)
  litQ: 2, // peaking filter Q (documented)
  litMaxCut: 12, // clamp on any band's cut (unverified)
  litMaxBoost: 6, // clamp on boosts when allowed (unverified)
  litHpf: true, // stage C on
  litHpfHz: 80, // high-pass frequency for non-low roles (unverified)
  litMakeup: true, // loudness-match make-up (ours, not in the papers)
});

const LOW_ROLES = new Set(["kick", "bass", "drums", "room"]);

function clip(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

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

export function deriveLitCurves(analyses, faderDb, perTrack, knobs, roles = []) {
  const N = analyses.length;
  const faders = faderDb.map((f) => (knobs.postFader ? 0 : f || 0));
  const live = analyses.map((a, i) => !!a && !a.empty && perTrack[i].enabled !== false);
  const w = weights(knobs.litBalanceWeighting);
  const amount = clip(knobs.litAmount ?? 0.5, 0, 1);
  const maxCut = Math.max(0, knobs.litMaxCut ?? 12);
  const maxBoost = knobs.litBalanceBoosts ? Math.max(0, knobs.litMaxBoost ?? 6) : 0;

  // Perceptually weighted band loudness at mix level.
  const L = analyses.map((a, i) => {
    const out = new Float64Array(NUM_BANDS).fill(-200);
    if (!live[i]) return out;
    for (let b = 0; b < NUM_BANDS; b++) if (a.S[b] >= SILENT_DB) out[b] = a.bandDb[b] + faders[i] + w[b];
    return out;
  });
  const S = analyses.map((a) => (a ? a.S : new Float64Array(NUM_BANDS).fill(-200)));
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

  // Stage A: toward the cross-channel average per band.
  const levelTerm = analyses.map(() => new Float64Array(NUM_BANDS));
  if (knobs.litBalance) {
    for (let b = 0; b < NUM_BANDS; b++) {
      let sum = 0;
      let n = 0;
      for (let i = 0; i < N; i++) if (live[i] && L[i][b] > -150) {
        sum += L[i][b];
        n++;
      }
      if (n < 2) continue;
      const avg = sum / n;
      for (let i = 0; i < N; i++) {
        if (!live[i] || L[i][b] <= -150) continue;
        levelTerm[i][b] = clip(amount * (avg - L[i][b]), -maxCut, maxBoost) + 0;
      }
    }
  }

  // Stage B: masking occurrences M[i][j][b] (masker i over maskee j).
  const dom = analyses.map(() => analyses.map(() => new Float64Array(NUM_BANDS)));
  const occurrences = []; // { i, j, b, m }
  if (knobs.litMasking) {
    for (let i = 0; i < N; i++) {
      if (!live[i]) continue;
      for (let j = 0; j < N; j++) {
        if (j === i || !live[j]) continue;
        const pw = knobs.pair?.[i]?.[j];
        const weight = (pw == null ? 1 : pw) * (perTrack[i].rowScale ?? 1);
        for (let b = 0; b < NUM_BANDS; b++) {
          if (!essential[j][b] || essential[i][b]) continue;
          if (L[i][b] <= -150 || L[j][b] <= -150) continue;
          const m = (L[i][b] - L[j][b]) * weight;
          if (m <= 0) continue;
          dom[j][i][b] = m;
          occurrences.push({ i, j, b, m });
        }
      }
    }
  }
  // Keep the top-K occurrences per cut target.
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
    let k = 0;
    for (const o of list) {
      if (k >= knobs.litTopK) break;
      if (seen.has(o.b)) continue; // one filter per band
      seen.add(o.b);
      const colScale = perTrack[t].colScale ?? 1;
      crossTerm[t][o.b] = Math.min(crossTerm[t][o.b], -amount * o.m * colScale);
      k++;
    }
  }

  const G = [];
  const unclamped = [];
  const self = [];
  const scoopTerm = analyses.map(() => new Float64Array(NUM_BANDS));
  const makeupDb = new Float64Array(N);
  const effect = new Float64Array(N);
  const ceilingBands = new Uint8Array(N);
  const pairContribution = analyses.map(() => new Float64Array(N));
  const hpfHz = new Float64Array(N);
  const mask = (i, b) => (knobs.mixMask?.[b] ?? 1) * ((perTrack[i].mask || ones())[b] ?? 1);

  for (let i = 0; i < N; i++) {
    const g = new Float64Array(NUM_BANDS);
    const u = new Float64Array(NUM_BANDS);
    const s = new Float64Array(NUM_BANDS);
    G.push(g);
    unclamped.push(u);
    self.push(s);
    if (!live[i]) continue;
    hpfHz[i] = hpfForRole(roles[i], knobs);
    let gMax = -Infinity;
    let gMin = Infinity;
    for (let b = 0; b < NUM_BANDS; b++) {
      const mk = mask(i, b);
      levelTerm[i][b] *= mk;
      crossTerm[i][b] *= mk;
      s[b] = levelTerm[i][b];
      u[b] = levelTerm[i][b] + crossTerm[i][b] + 0;
      g[b] = clip(u[b], -maxCut, maxBoost) + 0;
      if (audible[i][b]) {
        if (g[b] > gMax) gMax = g[b];
        if (g[b] < gMin) gMin = g[b];
        if (u[b] < -maxCut) ceilingBands[i]++;
      }
    }
    effect[i] = Number.isFinite(gMax) ? gMax - gMin : 0;
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
    makeupDb[i] = knobs.litMakeup && knobs.loudnessMatch ? estimateMakeup(analyses[i].bandPower, g) : 0;
  }

  // The literature's own objective: total masking (dB-sum of occurrences),
  // before and after the EQ.
  const litMasking = { before: 0, after: 0 };
  for (const o of occurrences) {
    litMasking.before += o.m;
    const after = o.m + G[o.i][o.b] - G[o.j][o.b] + (makeupDb[o.i] - makeupDb[o.j]);
    litMasking.after += Math.max(0, after);
  }

  const masking = maskingScore(analyses, faders, G, makeupDb, live);

  return {
    flow: "lit",
    self,
    levelTerm,
    scoopTerm,
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
    masking,
    crossMin: new Float64Array(N),
    flatRemovedDb: new Float64Array(N),
    presence: new Array(N).fill(0),
    occurrences,
  };
}
