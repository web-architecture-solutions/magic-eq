import React from "react";
import { Slider } from "./Controls.jsx";
import { PARAMS, titleOf } from "./params.js";
import { ROLES, DEFAULT_ROLE_OFFSETS } from "../dsp/roles.js";

// Configuration, not mix state: gain staging and analysis. Saved in this
// browser. The EQ's own controls live in the EQ panel.
export default function SettingsModal({ open, onClose, knobs, dispatch, onReanalyze, needsReanalysis, modified }) {
  if (!open) return null;
  const set = (key) => (value) => dispatch({ type: "SET_KNOB", key, value });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
        <header className="modal-head">
          <h2>Settings</h2>
          <span className="hint">gain staging and analysis; saved in this browser</span>
          <span className="spacer" />
          <button type="button" onClick={() => dispatch({ type: "RESET_SETTINGS" })} disabled={!modified}>
            Reset to defaults
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <h3>Gain staging</h3>
        <Slider k="targetLufs" value={knobs.targetLufs} min={-40} max={-6} step={1} onChange={set("targetLufs")} />
        <Slider k="peakTargetDb" value={knobs.peakTargetDb} min={-24} max={0} step={1} onChange={set("peakTargetDb")} />
        <div className="offsets" title={titleOf("roleOffsets")}>
          <span className="slider-label">{PARAMS.roleOffsets.name}</span>
          <div className="offsets-grid">
            {ROLES.map(([role, label]) => (
              <label key={role}>
                <span>{label}</span>
                <input
                  type="number"
                  step={0.5}
                  min={-24}
                  max={24}
                  value={(knobs.roleOffsets ?? DEFAULT_ROLE_OFFSETS)[role] ?? 0}
                  onChange={(e) => dispatch({ type: "SET_KNOB", key: "roleOffsets", value: { ...(knobs.roleOffsets ?? DEFAULT_ROLE_OFFSETS), [role]: parseFloat(e.target.value) || 0 } })}
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => dispatch({ type: "SET_KNOB", key: "roleOffsets", value: null })} disabled={!knobs.roleOffsets}>
            Reset offsets
          </button>
        </div>

        <h3>Analysis</h3>
        <Slider k="floorDb" value={knobs.floorDb} min={-60} max={-6} step={1} onChange={set("floorDb")} />
        <Slider k="gateDb" value={knobs.gateDb} min={-80} max={-20} step={1} onChange={set("gateDb")} />
        <p className="hint">The activity threshold is not saved between sessions: it changes how the next import is analysed.</p>
        {needsReanalysis ? (
          <button type="button" className="primary" onClick={onReanalyze}>
            Re-analyse with new threshold
          </button>
        ) : null}
      </div>
    </div>
  );
}
