import { Slider, Check } from "./Controls.jsx";
import MaskRow from "./MaskRow.jsx";
import { PARAMS, titleOf } from "./params.js";

export default function AdvancedPanel({ knobs, dispatch, onReanalyze, needsReanalysis }) {
  const set = (key) => (value) => dispatch({ type: "SET_KNOB", key, value });
  return (
    <div className="panel">
      <h2>Model</h2>
      <Slider k="D" value={knobs.D} min={3} max={24} step={0.5} onChange={set("D")} />
      <Slider k="floorDb" value={knobs.floorDb} min={-60} max={-6} step={1} onChange={set("floorDb")} />
      <Slider k="T" value={knobs.T} min={-30} max={-1} step={0.5} onChange={set("T")} />
      <Slider k="scoopRange" value={knobs.scoopRange} min={3} max={30} step={0.5} onChange={set("scoopRange")} />
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
        <Check k="coupled" checked={knobs.coupled} onChange={set("coupled")} />
      </div>
      <MaskRow values={knobs.mixMask} onChange={(band, value) => dispatch({ type: "SET_MIX_MASK", band, value })} label="mix lock" />

      <h2>Follow activity</h2>
      <div className="checks">
        <Check k="gateEnabled" checked={knobs.gateEnabled} onChange={set("gateEnabled")} />
      </div>
      <Slider k="attackTau" value={knobs.attackTau} min={0.02} max={2} step={0.01} onChange={set("attackTau")} />
      <Slider k="releaseTau" value={knobs.releaseTau} min={0.02} max={4} step={0.01} onChange={set("releaseTau")} />
      <Slider k="gateDb" value={knobs.gateDb} min={-80} max={-20} step={1} onChange={set("gateDb")} />
      {needsReanalysis ? (
        <button type="button" className="primary" onClick={onReanalyze}>
          Re-analyse with new threshold
        </button>
      ) : null}

      <h2>What the knobs do</h2>
      <dl className="help">
        {Object.entries(PARAMS).map(([k, p]) => (
          <div key={k}>
            <dt>
              {p.name}
              {p.symbol ? <span className="sym"> {p.symbol}</span> : null}
            </dt>
            <dd>
              {p.short} {p.long}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
