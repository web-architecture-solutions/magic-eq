import { knobDefaults, DEFAULT_KNOBS } from "../dsp/common.js";
import { SETTINGS_KEYS } from "./settings.js";
import { guessRole } from "../dsp/roles.js";

let nextId = 1;

export const initialState = {
  stems: [],
  knobs: knobDefaults(),
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
  };
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
      return { ...state, stems, sessionRate: stems.length ? state.sessionRate : null };
    }
    case "SET_STEM":
      return patchStem(state, action.id, action.patch);
    case "SET_KNOB":
      return { ...state, knobs: { ...state.knobs, [action.key]: action.value } };
    case "SET_KNOBS":
      return { ...state, knobs: { ...state.knobs, ...action.patch } };
    case "RESET_SETTINGS": {
      const patch = {};
      for (const k of SETTINGS_KEYS) patch[k] = DEFAULT_KNOBS[k];
      return { ...state, knobs: { ...state.knobs, ...patch } };
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

export function effectiveMuted(stems) {
  const anySolo = stems.some((s) => s.solo);
  return stems.map((s) => s.mute || (anySolo && !s.solo));
}
