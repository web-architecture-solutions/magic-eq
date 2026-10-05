import { knobDefaults } from "../dsp/model.js";
import { ones } from "../dsp/bands.js";

let nextId = 1;

export const initialState = {
  stems: [],
  knobs: knobDefaults(),
  pairById: {}, // { [sourceId]: { [targetId]: weight } }
  sessionRate: null,
  mixBypass: false,
  exportState: { status: "idle", progress: null, files: [], error: null },
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
    faderDb: 0,
    mute: false,
    solo: false,
    bypass: false,
    alpha: 0,
    beta: 0,
    rowScale: 1,
    colScale: 1,
    mask: ones(),
    enabled: true,
  };
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
      return { ...state, knobs: { ...state.knobs, [action.key]: action.value } };
    case "SET_KNOBS":
      return { ...state, knobs: { ...state.knobs, ...action.patch } };
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
    case "SET_MIX_BYPASS":
      return { ...state, mixBypass: action.value };
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
