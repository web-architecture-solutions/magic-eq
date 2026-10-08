import { describe, it, expect } from "vitest";
import { diffSettings, serializeSettings, parseSettings, loadSettings, saveSettings, isModified, SETTINGS_KEYS, STORAGE_KEY } from "../src/state/settings.js";
import { knobDefaults } from "../src/dsp/model.js";

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), map: m };
}

describe("settings persistence", () => {
  it("stores only settings keys that differ from the defaults", () => {
    const knobs = knobDefaults({ D: 18, carveDb: 9, faders: [1] });
    expect(diffSettings(knobs)).toEqual({ D: 18 });
    expect(isModified(knobs)).toBe(true);
    expect(isModified(knobDefaults())).toBe(false);
  });

  it("round-trips and drops invalid or unknown values", () => {
    const knobs = knobDefaults({ driveMode: "multiplier", floorDb: -30, psycho: true });
    const parsed = parseSettings(serializeSettings(knobs));
    expect(parsed).toEqual({ driveMode: "multiplier", floorDb: -30, psycho: true });
    expect(parseSettings(JSON.stringify({ version: 1, settings: { D: 999, crossNorm: "nope", carveDb: 7, T: -5 } }))).toEqual({ T: -5 });
    expect(parseSettings(JSON.stringify({ version: 0, settings: { D: 18 } }))).toEqual({});
    expect(parseSettings("not json")).toEqual({});
  });

  it("saves to and loads from storage, removing the key when nothing differs", () => {
    const store = fakeStorage();
    saveSettings(knobDefaults({ scoopRange: 20 }), store);
    expect(store.map.has(STORAGE_KEY)).toBe(true);
    expect(loadSettings(store)).toEqual({ scoopRange: 20 });
    saveSettings(knobDefaults(), store);
    expect(store.map.has(STORAGE_KEY)).toBe(false);
    expect(loadSettings(null)).toEqual({});
    expect(SETTINGS_KEYS).not.toContain("carveDb");
    expect(SETTINGS_KEYS).not.toContain("gateDb");
  });
});
