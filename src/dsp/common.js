// Defaults and helpers shared by the EQ model, the gain staging and the UI.

import { NUM_BANDS } from "./bands.js";

// Bands this far below a stem's own loudest band are treated as silent:
// they get no cuts and take no part in the masking test.
export const SILENT_DB = -60;

export const DEFAULT_KNOBS = Object.freeze({
  // Gain staging (Gain workspace)
  targetLufs: -23, // per-stem integrated loudness target before role offsets
  roleOffsets: null, // null = DEFAULT_ROLE_OFFSETS
  peakTargetDb: -6, // where "aim" puts the predicted mix peak (dBFS)
  postFader: false, // stems were bounced with their mix balance: ignore faders

  // Analysis
  gateDb: -50, // activity threshold: spectra accumulate only while a stem plays
  floorDb: -24, // audible range: bands within this of a stem's peak count for readouts

  // EQ (see litModel.js and src/ui/litParams.js for the provenance of each)
  litAmount: 0.5,
  litMasking: true,
  litCutTarget: "masker",
  litEssentialDb: 12,
  litTopK: 3,
  litQ: 2,
  litMaxCut: 12,
  litBalance: false, // a separate system (2009); on combines it with the 2015 masking stage
  litBalanceWeighting: "a",
  litBalanceBoosts: false,
  litMaxBoost: 6,
  litHpf: true,
  litHpfHz: 80,
  litMakeup: true, // loudness-matched make-up per stem (ours)
});

export function knobDefaults(overrides = {}) {
  return { ...DEFAULT_KNOBS, ...overrides };
}

export function clip(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

// A-weighting (dB) at a frequency: the 40-phon equal-loudness approximation.
export function aWeightDb(f) {
  const f2 = f * f;
  const ra = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2));
  return 20 * Math.log10(ra) + 2.0;
}

// Gain (dB) that restores a stem's band-weighted power after its cuts, so
// bypass comparisons are level-matched.
export function estimateMakeup(bandPower, G) {
  let before = 0;
  let after = 0;
  for (let b = 0; b < Math.min(bandPower.length, NUM_BANDS); b++) {
    before += bandPower[b];
    after += bandPower[b] * Math.pow(10, G[b] / 10);
  }
  if (before <= 0 || after <= 0) return 0;
  return -10 * Math.log10(after / before) + 0;
}
