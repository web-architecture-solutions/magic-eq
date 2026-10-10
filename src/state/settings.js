// Configuration that persists across sessions: gain staging and analysis,
// never mix state. Stored sparsely (only values that differ from defaults)
// under a versioned key, validated on load, with storage access at the edge.
// Keys that are no longer settings (from older versions) are ignored.
import { DEFAULT_KNOBS } from "../dsp/common.js";
import { DEFAULT_ROLE_OFFSETS } from "../dsp/roles.js";

export const SETTINGS_VERSION = 1;
export const STORAGE_KEY = "magic-eq.settings";
export const SETTINGS_KEYS = ["floorDb", "targetLufs", "roleOffsets", "peakTargetDb"];

const num = (lo, hi) => (v) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

export const VALIDATORS = {
  floorDb: num(-60, -6),
  targetLufs: num(-40, -6),
  peakTargetDb: num(-24, 0),
  roleOffsets: (v) => v === null || (v && typeof v === "object" && Object.keys(DEFAULT_ROLE_OFFSETS).every((k) => v[k] === undefined || num(-24, 24)(v[k]))),
};

function same(a, b) {
  return a === b || (a && b && typeof a === "object" && JSON.stringify(a) === JSON.stringify(b));
}

export function diffSettings(knobs, defaults = DEFAULT_KNOBS) {
  const out = {};
  for (const k of SETTINGS_KEYS) if (!same(knobs[k], defaults[k]) && VALIDATORS[k](knobs[k])) out[k] = knobs[k];
  return out;
}

export function isModified(knobs, defaults = DEFAULT_KNOBS) {
  return Object.keys(diffSettings(knobs, defaults)).length > 0;
}

export function serializeSettings(knobs) {
  return JSON.stringify({ version: SETTINGS_VERSION, settings: diffSettings(knobs) });
}

export function parseSettings(json) {
  const out = {};
  try {
    const data = JSON.parse(json);
    if (!data || data.version !== SETTINGS_VERSION || typeof data.settings !== "object") return out;
    for (const k of SETTINGS_KEYS) {
      const v = data.settings[k];
      if (v !== undefined && VALIDATORS[k](v)) out[k] = v;
    }
  } catch {
    /* ignore */
  }
  return out;
}

function storage(explicit) {
  if (explicit) return explicit;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function loadSettings(store) {
  try {
    const s = storage(store);
    const raw = s?.getItem(STORAGE_KEY);
    return raw ? parseSettings(raw) : {};
  } catch {
    return {};
  }
}

export function saveSettings(knobs, store) {
  try {
    const s = storage(store);
    if (!s) return;
    const diff = diffSettings(knobs);
    if (Object.keys(diff).length === 0) s.removeItem(STORAGE_KEY);
    else s.setItem(STORAGE_KEY, serializeSettings(knobs));
  } catch {
    /* ignore */
  }
}

export function settingsDefaults() {
  const out = {};
  for (const k of SETTINGS_KEYS) out[k] = DEFAULT_KNOBS[k];
  return out;
}
