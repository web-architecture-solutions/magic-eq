import { Slider, Check } from "./Controls.jsx";
import MaskRow from "./MaskRow.jsx";
import { PARAMS } from "./params.js";
import { LOCK_PRESETS } from "./presets.js";

export default function AdvancedPanel({ knobs, dispatch }) {
  const set = (key) => (value) => dispatch({ type: "SET_KNOB", key, value });
  return (
    <div className="panel">
      <h2>Band locks</h2>
      <MaskRow values={knobs.mixMask} onChange={(band, value) => dispatch({ type: "SET_MIX_MASK", band, value })} label="mix lock" />
      <div className="lock-presets">
        {LOCK_PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => dispatch({ type: "SET_KNOB", key: "mixMask", value: p.apply(knobs.mixMask) })}>
            {p.name}
          </button>
        ))}
      </div>

      <h2>Follow activity</h2>
      <div className="checks">
        <Check k="gateEnabled" checked={knobs.gateEnabled} onChange={set("gateEnabled")} />
      </div>
      <Slider k="attackTau" value={knobs.attackTau} min={0.02} max={2} step={0.01} onChange={set("attackTau")} />
      <Slider k="releaseTau" value={knobs.releaseTau} min={0.02} max={4} step={0.01} onChange={set("releaseTau")} />
      <p className="hint">Model configuration (dominance range, audible range, reach, combine mode, stem drive) lives in Settings in the nav bar.</p>

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
