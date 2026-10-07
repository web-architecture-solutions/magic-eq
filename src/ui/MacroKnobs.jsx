import { Slider, Check } from "./Controls.jsx";

// The five knobs that matter, plus the two switches you must get right.
export default function MacroKnobs({ knobs, dispatch }) {
  const set = (key) => (value) => dispatch({ type: "SET_KNOB", key, value });
  return (
    <div className="macro">
      <Slider k="carveDb" value={knobs.carveDb} min={0} max={12} step={0.1} onChange={set("carveDb")} />
      <Slider k="levelDb" value={knobs.levelDb} min={0} max={12} step={0.1} onChange={set("levelDb")} />
      <Slider k="scoopDb" value={knobs.scoopDb} min={0} max={12} step={0.1} onChange={set("scoopDb")} />
      <Slider k="focus" value={knobs.focus} min={0} max={1} step={0.05} onChange={set("focus")} />
      <Slider k="maxCut" value={knobs.maxCut} min={0.5} max={12} step={0.5} onChange={set("maxCut")} />
      <div className="macro-checks">
        <Check k="postFader" checked={knobs.postFader} onChange={set("postFader")} />
        <Check k="loudnessMatch" checked={knobs.loudnessMatch} onChange={set("loudnessMatch")} />
        <Check k="gateEnabled" checked={knobs.gateEnabled} onChange={set("gateEnabled")} />
      </div>
    </div>
  );
}
