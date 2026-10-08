import { knobDefaults, DEFAULT_KNOBS } from "../dsp/model.js";
import { SETTINGS_KEYS } from "./settings.js";
import { guessRole } from "../dsp/roles.js";
import { ones } from "../dsp/bands.js";

let nextId = 1;

export const initialState = {
  stems: [],
  knobs: knobDefaults(),
  pairById: {}, // { [sourceId]: { [targetId]: weight } }
  sessionRate: null,
  // Listening: which condition plays (raw stems, balanced faders, or with
  // EQ) and whether conditions are loudness-matched at the listening level.
  // Monitoring only: never exported.
  compare: { condition: "eq", match: true, listenLufs: -20 },
  masterTrimDb: 0,
  lastBalance: null, // { method, shiftDb, at }
  exportState: { status: "idle", progress: null, files: [], error: null, evaluation: null },
};

export function newStem(name) {
  return {
    id: nextId++,
    name,
    status: "decoding", // decoding | analyzing | ready | error
    progress: 0,
    error: null,
    buffer: null,
    sampleRate: null,
    nativeRate: null,
    channels: 0,
    length: 0,
    durationSec: 0,
    analysis: null,
    role: guessRole(name),
    autoFaderDb: null, // set by Balance
    trimDb: 0, // manual, survives a re-balance
    mute: false,
    solo: false,
    bypass: false,
    level: 1,
    scoop: 1,
    presenceDb: 0,
    rowScale: 1,
    colScale: 1,
    mask: ones(),
    enabled: true,
  };
}

// Switching coupling converts each stem's Flatten/Scoop between multiplier
// and absolute dB so the sliders keep their meaning.
function withCoupling(state, coupled) {
  if (coupled === state.knobs.coupled) return state;
  const { levelDb, scoopDb } = state.knobs;
  const stems = state.stems.map((s) => ({
    ...s,
    level: coupled ? (levelDb > 0 ? (s.level ?? 0) / levelDb : 1) : (s.level ?? 1) * levelDb,
    scoop: coupled ? (scoopDb > 0 ? (s.scoop ?? 0) / scoopDb : 1) : (s.scoop ?? 1) * scoopDb,
  }));
  return { ...state, stems, knobs: { ...state.knobs, coupled } };
}

// The fader the model and the engine use.
export function stemFaderDb(stem) {
  return (stem.autoFaderDb ?? 0) + (stem.trimDb ?? 0);
}

export function initState(persistedSettings = {}) {
  return { ...initialState, knobs: { ...initialState.knobs, ...persistedSettings } };
}

function patchStem(state, id, patch) {
  return { ...state, stems: state.stems.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
}

export function reducer(state, action) {
  switch (action.type) {
    case "ADD_STEMS":
      return { ...state, stems: [...state.stems, ...action.stems] };
    case "STEM_DECODED": {
      const sessionRate = state.sessionRate ?? action.decoded.sampleRate;
      return {
        ...patchStem(state, action.id, { ...action.decoded, status: "analyzing", progress: 0 }),
        sessionRate,
      };
    }
    case "STEM_PROGRESS":
      return patchStem(state, action.id, { progress: action.progress });
    case "STEM_ANALYZED":
      return patchStem(state, action.id, { analysis: action.analysis, status: "ready", progress: 1 });
    case "STEM_REANALYZING":
      return patchStem(state, action.id, { status: "analyzing", progress: 0 });
    case "STEM_ERROR":
      return patchStem(state, action.id, { status: "error", error: action.error });
    case "REMOVE_STEM": {
      const stems = state.stems.filter((s) => s.id !== action.id);
      const pairById = { ...state.pairById };
      delete pairById[action.id];
      for (const k of Object.keys(pairById)) {
        if (pairById[k][action.id] != null) {
          pairById[k] = { ...pairById[k] };
          delete pairById[k][action.id];
        }
      }
      return { ...state, stems, pairById, sessionRate: stems.length ? state.sessionRate : null };
    }
    case "SET_STEM":
      return patchStem(state, action.id, action.patch);
    case "SET_STEM_MASK": {
      const stem = state.stems.find((s) => s.id === action.id);
      if (!stem) return state;
      const mask = stem.mask.slice();
      mask[action.band] = action.value;
      return patchStem(state, action.id, { mask });
    }
    case "SET_KNOB":
      if (action.key === "coupled") return withCoupling(state, action.value);
      return { ...state, knobs: { ...state.knobs, [action.key]: action.value } };
    case "SET_KNOBS":
      return { ...state, knobs: { ...state.knobs, ...action.patch } };
    case "RESET_SETTINGS": {
      let next = withCoupling(state, DEFAULT_KNOBS.coupled);
      const patch = {};
      for (const k of SETTINGS_KEYS) patch[k] = DEFAULT_KNOBS[k];
      return { ...next, knobs: { ...next.knobs, ...patch } };
    }
    case "SET_MIX_MASK": {
      const mixMask = state.knobs.mixMask.slice();
      mixMask[action.band] = action.value;
      return { ...state, knobs: { ...state.knobs, mixMask } };
    }
    case "SET_PAIR": {
      const row = { ...(state.pairById[action.source] || {}) };
      if (action.value == null || action.value === 1) delete row[action.target];
      else row[action.target] = action.value;
      return { ...state, pairById: { ...state.pairById, [action.source]: row } };
    }
    case "SET_COMPARE":
      return { ...state, compare: { ...state.compare, ...action.patch } };
    case "SET_MASTER_TRIM":
      return { ...state, masterTrimDb: action.value };
    case "BALANCE": {
      const by = new Map(action.faders.map((f) => [f.id, f.autoFaderDb]));
      return {
        ...state,
        stems: state.stems.map((s) => (by.has(s.id) ? { ...s, autoFaderDb: by.get(s.id) } : s)),
        knobs: { ...state.knobs, postFader: false },
        lastBalance: { method: action.method, shiftDb: action.shiftDb, at: Date.now() },
      };
    }
    case "RESET_TRIMS":
      return { ...state, stems: state.stems.map((s) => ({ ...s, trimDb: 0 })) };
    case "CLEAR_BALANCE":
      return { ...state, stems: state.stems.map((s) => ({ ...s, autoFaderDb: null })), lastBalance: null };
    case "EXPORT_STATE":
      return { ...state, exportState: { ...state.exportState, ...action.patch } };
    default:
      return state;
  }
}

// N x N [source][target] override array for the model, or null when empty.
export function pairArray(stems, pairById) {
  let any = false;
  const arr = stems.map((src) =>
    stems.map((tgt) => {
      const v = pairById[src.id]?.[tgt.id];
      if (v != null) any = true;
      return v ?? null;
    })
  );
  return any ? arr : null;
}

export function effectiveMuted(stems) {
  const anySolo = stems.some((s) => s.solo);
  return stems.map((s) => s.mute || (anySolo && !s.solo));
}
