import MaskRow from "./MaskRow.jsx";

function Knob({ label, k, knobs, dispatch, min, max, step, unit = "", title }) {
  const v = knobs[k];
  return (
    <label className="slider" title={title}>
      <span className="slider-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => dispatch({ type: "SET_KNOB", key: k, value: parseFloat(e.target.value) })} />
      <span className="slider-value">
        {v.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
        {unit}
      </span>
    </label>
  );
}

function Check({ label, k, knobs, dispatch, title }) {
  return (
    <label className="check" title={title}>
      <input type="checkbox" checked={!!knobs[k]} onChange={(e) => dispatch({ type: "SET_KNOB", key: k, value: e.target.checked })} /> {label}
    </label>
  );
}

export default function KnobPanel({ knobs, dispatch, onReanalyze, needsReanalysis }) {
  return (
    <section className="panel">
      <h2>Mix knobs</h2>
      <Knob label="cross depth W" k="W" knobs={knobs} dispatch={dispatch} min={0} max={12} step={0.1} unit=" dB" title="Global depth of the cross-track cuts. The one master knob." />
      <Knob label="headroom H" k="H" knobs={knobs} dispatch={dispatch} min={0} max={12} step={0.5} unit=" dB" title="A band is cut even when the other stem is up to H dB quieter there." />
      <Knob label="range D" k="D" knobs={knobs} dispatch={dispatch} min={3} max={24} step={0.5} unit=" dB" title="Dominance that gives the full cut." />
      <Knob label="max cut" k="maxCut" knobs={knobs} dispatch={dispatch} min={0} max={12} step={0.5} unit=" dB" title="Clamp on any band's total cut." />
      <Knob label="stacking" k="stackNorm" knobs={knobs} dispatch={dispatch} min={0} max={1} step={0.05} title="Divide stacked cuts by n^stacking (0 = plain sum, 1 = average)." />
      <Knob label="floor" k="floorDb" knobs={knobs} dispatch={dispatch} min={-80} max={0} step={1} unit=" dB" title="No cross cuts where the target is this far below its own peak." />
      <Knob label="level thresh. T" k="T" knobs={knobs} dispatch={dispatch} min={-30} max={0} step={0.5} unit=" dB" title="Self 'level' term only touches bands within T dB of the stem's peak." />
      <div className="checks">
        <Check label="stems are post-fader" k="postFader" knobs={knobs} dispatch={dispatch} title="Faders forced to 0 dB: the recorded level carries the mix balance." />
        <Check label="loudness-match make-up" k="loudnessMatch" knobs={knobs} dispatch={dispatch} title="Off to hear the loudness bias of the cuts." />
      </div>
      <MaskRow values={knobs.mixMask} onChange={(band, value) => dispatch({ type: "SET_MIX_MASK", band, value })} label="mix mask" />

      <h2>Gate</h2>
      <div className="checks">
        <Check label="gate cross cuts to source activity" k="gateEnabled" knobs={knobs} dispatch={dispatch} title="Each stem's cuts on the others fade in while it plays." />
      </div>
      <Knob label="attack" k="attackTau" knobs={knobs} dispatch={dispatch} min={0.02} max={2} step={0.01} unit=" s" title="Time constant when a source enters." />
      <Knob label="release" k="releaseTau" knobs={knobs} dispatch={dispatch} min={0.02} max={4} step={0.01} unit=" s" title="Time constant when a source drops out." />
      <Knob label="threshold" k="gateDb" knobs={knobs} dispatch={dispatch} min={-80} max={-20} step={1} unit=" dBFS" title="Frames below this count as silent (needs re-analysis)." />
      {needsReanalysis ? (
        <button type="button" className="primary" onClick={onReanalyze}>
          Re-analyse with new threshold
        </button>
      ) : null}
    </section>
  );
}
