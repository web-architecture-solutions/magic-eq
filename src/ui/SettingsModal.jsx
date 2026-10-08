import { Slider, Check } from "./Controls.jsx";
import { PARAMS, titleOf } from "./params.js";

// Configuration, not mix state: how the model is set up. Persisted.
export default function SettingsModal({ open, onClose, knobs, dispatch, onReanalyze, needsReanalysis, modified }) {
  if (!open) return null;
  const set = (key) => (value) => dispatch({ type: "SET_KNOB", key, value });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Settings">
        <header className="modal-head">
          <h2>Settings</h2>
          <span className="hint">how the model is configured; saved in this browser</span>
          <span className="spacer" />
          <button type="button" onClick={() => dispatch({ type: "RESET_SETTINGS" })} disabled={!modified}>
            Reset to defaults
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <h3>Stems</h3>
        <label className="slider" title={titleOf("driveMode")}>
          <span className="slider-label">{PARAMS.driveMode.name}</span>
          <select value={knobs.driveMode} onChange={(e) => dispatch({ type: "SET_KNOB", key: "driveMode", value: e.target.value })}>
            <option value="presence">Presence (dB)</option>
            <option value="multiplier">Carves others (×)</option>
          </select>
          <span />
        </label>
        <div className="checks">
          <Check k="coupled" checked={knobs.coupled} onChange={set("coupled")} />
        </div>
        <p className="hint">Toggling coupling converts each stem's Flatten × and Scoop × between multiplier and dB so the sliders keep their meaning.</p>

        <h3>Model</h3>
        <label className="slider" title={titleOf("crossNorm")}>
          <span className="slider-label">{PARAMS.crossNorm.name}</span>
          <select value={knobs.crossNorm} onChange={(e) => dispatch({ type: "SET_KNOB", key: "crossNorm", value: e.target.value })}>
            <option value="max">loudest competitor (max)</option>
            <option value="sum">power sum of competitors</option>
            <option value="mean">average competitor</option>
          </select>
          <span />
        </label>
        <div className="checks">
          <Check k="psycho" label="Psychoacoustic weighting (A-weighting + upward spread)" checked={knobs.psycho} onChange={set("psycho")} />
        </div>
        <Slider k="D" value={knobs.D} min={3} max={24} step={0.5} onChange={set("D")} />
        <p className="hint">Selectivity in the view sets where "equal level" sits on this ramp.</p>
        <Slider k="floorDb" value={knobs.floorDb} min={-60} max={-6} step={1} onChange={set("floorDb")} />
        <Slider k="T" value={knobs.T} min={-30} max={-1} step={0.5} onChange={set("T")} />
        <Slider k="scoopRange" value={knobs.scoopRange} min={3} max={30} step={0.5} onChange={set("scoopRange")} />

        <h3>Analysis</h3>
        <Slider k="gateDb" value={knobs.gateDb} min={-80} max={-20} step={1} onChange={set("gateDb")} />
        <p className="hint">Not saved between sessions: it changes how the next import is analysed.</p>
        {needsReanalysis ? (
          <button type="button" className="primary" onClick={onReanalyze}>
            Re-analyse with new threshold
          </button>
        ) : null}
      </div>
    </div>
  );
}
