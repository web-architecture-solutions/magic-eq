import MaskRow from "./MaskRow.jsx";
import SpectrumPlot from "./SpectrumPlot.jsx";

function Slider({ label, value, min, max, step, onChange, unit = "", disabled, title }) {
  return (
    <label className="slider" title={title}>
      <span className="slider-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="slider-value">
        {typeof value === "number" ? value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0) : value}
        {unit}
      </span>
    </label>
  );
}

export default function StemRow({ stem, index, curves, muted, knobs, dispatch, onRemove, needsReanalysis }) {
  const set = (patch) => dispatch({ type: "SET_STEM", id: stem.id, patch });
  const a = stem.analysis;
  const G = curves?.G?.[index];
  const makeup = curves?.makeupDb?.[index] ?? 0;
  const statusText =
    stem.status === "decoding"
      ? "decoding…"
      : stem.status === "analyzing"
        ? `analysing ${Math.round(stem.progress * 100)}%`
        : stem.status === "error"
          ? `error: ${stem.error}`
          : a?.empty
            ? "silent (excluded)"
            : `${stem.channels} ch · ${stem.durationSec.toFixed(1)} s · ${stem.nativeRate} Hz${stem.nativeRate !== stem.sampleRate ? ` → ${stem.sampleRate} Hz` : ""}`;

  return (
    <section className={`stem${muted ? " muted" : ""}${stem.enabled ? "" : " disabled"}`}>
      <header className="stem-head">
        <strong className="stem-name" title={stem.name}>
          {stem.name}
        </strong>
        <span className="stem-status">{statusText}</span>
        {needsReanalysis ? <span className="warn">gate changed, re-analyse</span> : null}
        <span className="spacer" />
        <button type="button" className={`tog${stem.mute ? " on" : ""}`} onClick={() => set({ mute: !stem.mute })} title="Mute">
          M
        </button>
        <button type="button" className={`tog${stem.solo ? " on" : ""}`} onClick={() => set({ solo: !stem.solo })} title="Solo">
          S
        </button>
        <button
          type="button"
          className={`tog${stem.bypass ? " on" : ""}`}
          onClick={() => set({ bypass: !stem.bypass })}
          title="Bypass this stem's EQ (loudness matched)"
        >
          Byp
        </button>
        <label className="tog-label" title="Exclude from the model entirely">
          <input type="checkbox" checked={stem.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> in model
        </label>
        <button type="button" className="remove" onClick={onRemove} title="Remove stem">
          ×
        </button>
      </header>

      <div className="stem-body">
        <div className="stem-controls">
          <Slider
            label="fader"
            value={knobs.postFader ? 0 : stem.faderDb}
            min={-40}
            max={12}
            step={0.5}
            unit=" dB"
            disabled={knobs.postFader}
            onChange={(v) => set({ faderDb: v })}
            title="Intended mix level. Drives the cross cuts; disabled when stems are post-fader."
          />
          <Slider label="level α" value={stem.alpha} min={0} max={1} step={0.05} onChange={(v) => set({ alpha: v })} title="Damp this stem's own peaks" />
          <Slider label="scoop β" value={stem.beta} min={0} max={1} step={0.05} onChange={(v) => set({ beta: v })} title="Cut the valleys between this stem's modes" />
          <Slider label="carves ×" value={stem.rowScale} min={0} max={3} step={0.05} onChange={(v) => set({ rowScale: v })} title="How hard this stem carves the others (row scalar)" />
          <Slider label="accepts ×" value={stem.colScale} min={0} max={3} step={0.05} onChange={(v) => set({ colScale: v })} title="How much this stem accepts cuts from others (column scalar). 0 for leads and vocals." />
          <div className="readouts">
            <span title="Make-up gain restoring the stem's band-weighted power">make-up {makeup.toFixed(2)} dB</span>
            {a ? <span title="Fraction of frames above the gate">active {(a.gate.activeFraction * 100).toFixed(0)}%</span> : null}
            {a ? <span title="Peak band level (dBFS, sine-calibrated)">peak {a.peakDb.toFixed(1)} dB</span> : null}
          </div>
          <MaskRow values={stem.mask} onChange={(band, value) => dispatch({ type: "SET_STEM_MASK", id: stem.id, band, value })} label="mask" />
        </div>
        <div className="stem-plot">
          {a && !a.empty ? (
            <SpectrumPlot S={a.S} E={a.E} G={G} unclamped={curves?.unclampedSum?.[index]} maxCut={knobs.maxCut} />
          ) : (
            <div className="plot-placeholder">{statusText}</div>
          )}
        </div>
      </div>
    </section>
  );
}
