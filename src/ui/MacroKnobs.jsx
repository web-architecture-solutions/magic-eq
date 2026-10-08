import { Slider, Check } from "./Controls.jsx";
import { PRESETS, matchPreset } from "./presets.js";

const TERM_OF = { carveDb: "cross", levelDb: "level", scoopDb: "scoop" };

// The knobs that matter, plus the switches you must get right. Hovering a
// depth knob highlights its share of every stem's cut.
export default function MacroKnobs({ knobs, dispatch, onHighlight, compact }) {
  const set = (key) => (value) => dispatch({ type: "SET_KNOB", key, value });
  const hover = (key) => (on) => onHighlight?.(on ? TERM_OF[key] : null);
  const preset = matchPreset(knobs);
  return (
    <div className={`macro${compact ? " compact" : ""}`}>
      <label className="slider preset" title="Named knob bundles. Any tweak turns the selection into 'custom'.">
        <span className="slider-label">preset</span>
        <select
          value={preset}
          onChange={(e) => {
            const p = PRESETS.find((x) => x.id === e.target.value);
            if (p) dispatch({ type: "SET_KNOBS", patch: p.knobs });
          }}
        >
          {preset === "custom" ? <option value="custom">custom</option> : null}
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span />
      </label>
      <Slider k="carveDb" value={knobs.carveDb} min={0} max={12} step={0.1} onChange={set("carveDb")} onHover={hover("carveDb")} />
      <Slider k="levelDb" value={knobs.levelDb} min={0} max={12} step={0.1} onChange={set("levelDb")} onHover={hover("levelDb")} />
      <Slider k="scoopDb" value={knobs.scoopDb} min={0} max={12} step={0.1} onChange={set("scoopDb")} onHover={hover("scoopDb")} />
      <Slider k="focus" value={knobs.focus} min={0} max={1} step={0.05} onChange={set("focus")} />
      <div className="ceiling-pair">
        <Slider k="maxCut" value={knobs.maxCut} min={0.5} max={18} step={0.5} onChange={set("maxCut")} />
        <Slider k="knee" value={knobs.knee} min={0} max={0.5} step={0.05} onChange={set("knee")} />
      </div>
      <div className="macro-checks">
        <Check k="postFader" checked={knobs.postFader} onChange={set("postFader")} />
        <Check k="loudnessMatch" checked={knobs.loudnessMatch} onChange={set("loudnessMatch")} />
        <Check k="gateEnabled" checked={knobs.gateEnabled} onChange={set("gateEnabled")} />
      </div>
    </div>
  );
}
