// Named knob bundles. Names are placeholders to rename by ear.
export const PRESETS = [
  { id: "off", name: "Off", knobs: { carveDb: 0, levelDb: 0, scoopDb: 0 } },
  { id: "glue", name: "Gentle glue", knobs: { carveDb: 2, levelDb: 0, scoopDb: 1, focus: 0.6, maxCut: 6 } },
  { id: "clear", name: "Clear", knobs: { carveDb: 5, levelDb: 1, scoopDb: 3, focus: 0.4, maxCut: 9 } },
  { id: "bleed", name: "Let it bleed", knobs: { carveDb: 1, levelDb: 0, scoopDb: 0, focus: 0.8, maxCut: 3 } },
];

export function matchPreset(knobs) {
  for (const p of PRESETS) {
    if (Object.entries(p.knobs).every(([k, v]) => Math.abs((knobs[k] ?? 0) - v) < 1e-9)) return p.id;
  }
  return "custom";
}

// Band-lock presets over the 16 bands (centres 25 Hz .. 16.5 kHz).
export const LOCK_PRESETS = [
  { id: "clear", name: "No locks", apply: (m) => m.map(() => 1) },
  { id: "lows", name: "Protect lows (< 100 Hz)", apply: (m) => m.map((v, b) => (b <= 3 ? 0 : v)) },
  { id: "lowmids", name: "Protect low mids (200–500 Hz)", apply: (m) => m.map((v, b) => (b === 5 || b === 6 ? Math.min(v, 0.5) : v)) },
];
