import { describe, it, expect } from "vitest";
import { diffSettings, serializeSettings, parseSettings, loadSettings, saveSettings, isModified, SETTINGS_KEYS, STORAGE_KEY } from "../src/state/settings.js";
import { knobDefaults } from "../src/dsp/common.js";

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), map: m };
}

describe("settings persistence", () => {
  it("persists the peak target within 0 to -24 dBFS", () => {
    expect(parseSettings(serializeSettings(knobDefaults({ peakTargetDb: 0 })))).toEqual({ peakTargetDb: 0 });
    expect(parseSettings(JSON.stringify({ version: 1, settings: { peakTargetDb: 3 } }))).toEqual({});
  });

  it("stores only settings keys that differ from the defaults", () => {
    const knobs = knobDefaults({ targetLufs: -18, litAmount: 0.9, faders: [1] });
    expect(diffSettings(knobs)).toEqual({ targetLufs: -18 });
    expect(isModified(knobs)).toBe(true);
    expect(isModified(knobDefaults())).toBe(false);
  });

  it("round-trips and drops invalid or unknown values", () => {
    const knobs = knobDefaults({ floorDb: -30, targetLufs: -20 });
    const parsed = parseSettings(serializeSettings(knobs));
    expect(parsed).toEqual({ floorDb: -30, targetLufs: -20 });
    // Settings from the archived model (flow, D, driveMode) are ignored.
    expect(parseSettings(JSON.stringify({ version: 1, settings: { floorDb: 999, flow: "lit", D: 12, driveMode: "presence", targetLufs: -18 } }))).toEqual({ targetLufs: -18 });
    expect(parseSettings(JSON.stringify({ version: 0, settings: { targetLufs: -18 } }))).toEqual({});
    expect(parseSettings("not json")).toEqual({});
  });

  it("saves to and loads from storage, removing the key when nothing differs", () => {
    const store = fakeStorage();
    saveSettings(knobDefaults({ floorDb: -30 }), store);
    expect(store.map.has(STORAGE_KEY)).toBe(true);
    expect(loadSettings(store)).toEqual({ floorDb: -30 });
    saveSettings(knobDefaults(), store);
    expect(store.map.has(STORAGE_KEY)).toBe(false);
    expect(loadSettings(null)).toEqual({});
    expect(SETTINGS_KEYS).not.toContain("litAmount");
    expect(SETTINGS_KEYS).not.toContain("gateDb");
  });
});
