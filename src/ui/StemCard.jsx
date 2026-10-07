import { Slider, Check } from "./Controls.jsx";
import MaskRow from "./MaskRow.jsx";
import SpectrumPlot from "./SpectrumPlot.jsx";
import ActivityStrip from "./ActivityStrip.jsx";
import { titleOf } from "./params.js";

function statusOf(stem) {
  const a = stem.analysis;
  if (stem.status === "decoding") return "decoding…";
  if (stem.status === "analyzing") return `analysing ${Math.round(stem.progress * 100)}%`;
  if (stem.status === "error") return `error: ${stem.error}`;
  if (a?.empty) return "silent (excluded)";
  return `${stem.channels} ch · ${stem.durationSec.toFixed(1)} s · ${stem.nativeRate} Hz${stem.nativeRate !== stem.sampleRate ? ` → ${stem.sampleRate} Hz` : ""}`;
}

// One stem. `advanced` adds the per-stem model controls.
export default function StemCard({ stem, index, curves, liveG, muted, knobs, dispatch, onRemove, advanced, position, needsReanalysis }) {
  const set = (patch) => dispatch({ type: "SET_STEM", id: stem.id, patch });
  const a = stem.analysis;
  const ready = stem.status === "ready" && a && !a.empty;
  const effect = curves?.effect?.[index] ?? 0;
  const flat = curves?.flatRemovedDb?.[index] ?? 0;
  const ceiling = curves?.ceilingBands?.[index] ?? 0;
  const makeup = curves?.makeupDb?.[index] ?? 0;

  return (
    <section className={`stem${muted ? " muted" : ""}${stem.enabled ? "" : " disabled"}`}>
      <header className="stem-head">
        <strong className="stem-name" title={stem.name}>
          {stem.name}
        </strong>
        <span className="stem-status">{statusOf(stem)}</span>
        {needsReanalysis ? <span className="warn">threshold changed, re-analyse</span> : null}
        <span className="spacer" />
        <button type="button" className={`tog${stem.mute ? " on" : ""}`} onClick={() => set({ mute: !stem.mute })} title="Mute">
          M
        </button>
        <button type="button" className={`tog${stem.solo ? " on" : ""}`} onClick={() => set({ solo: !stem.solo })} title="Solo">
          S
        </button>
        <button type="button" className={`tog${stem.bypass ? " on" : ""}`} onClick={() => set({ bypass: !stem.bypass })} title="Bypass this stem's EQ, loudness matched">
          Byp
        </button>
        <label className="tog-label" title="Untick to leave this stem untouched and out of everyone else's dominance test (a wide pad, say).">
          <input type="checkbox" checked={stem.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> in model
        </label>
        <button type="button" className="remove" onClick={onRemove} title="Remove stem">
          ×
        </button>
      </header>

      <div className={`stem-body${advanced ? " advanced" : ""}`}>
        <div className="stem-controls">
          <Slider k="fader" value={knobs.postFader ? 0 : stem.faderDb} min={-40} max={12} step={0.5} disabled={knobs.postFader} onChange={(v) => set({ faderDb: v })} />
          {advanced ? (
            <>
              <Slider k="level" label={knobs.coupled ? "Flatten ×" : "Flatten"} unit={knobs.coupled ? "×" : "dB"} value={stem.level} min={0} max={knobs.coupled ? 3 : 12} step={knobs.coupled ? 0.05 : 0.1} onChange={(v) => set({ level: v })} />
              <Slider k="scoop" label={knobs.coupled ? "Scoop ×" : "Scoop"} unit={knobs.coupled ? "×" : "dB"} value={stem.scoop} min={0} max={knobs.coupled ? 3 : 12} step={knobs.coupled ? 0.05 : 0.1} onChange={(v) => set({ scoop: v })} />
              <Slider k="rowScale" value={stem.rowScale} min={0} max={3} step={0.05} onChange={(v) => set({ rowScale: v })} />
              <Slider k="colScale" value={stem.colScale} min={0} max={3} step={0.05} onChange={(v) => set({ colScale: v })} />
            </>
          ) : null}
          <div className="readouts">
            <span title="Contrast actually applied: deepest minus shallowest cut across this stem's audible range. This is the part you can hear.">effect {effect.toFixed(1)} dB</span>
            <span title="Cross cut that was the same in every audible band and was removed, because make-up gain would have cancelled it anyway.">flat removed {flat.toFixed(1)} dB</span>
            {ceiling ? <span className="warn" title="Audible bands whose cut is being compressed by the ceiling.">{ceiling} at ceiling</span> : null}
            <span title={titleOf("loudnessMatch")}>make-up {makeup.toFixed(1)} dB</span>
          </div>
          {advanced ? <MaskRow values={stem.mask} onChange={(band, value) => dispatch({ type: "SET_STEM_MASK", id: stem.id, band, value })} label="band lock" /> : null}
        </div>
        <div className="stem-plot">
          {ready ? (
            <>
              <SpectrumPlot S={a.S} E={a.E} G={curves?.G?.[index]} unclamped={curves?.unclamped?.[index]} live={liveG} maxCut={knobs.maxCut} audible={curves?.audible?.[index]} />
              <ActivityStrip transitions={a.gate.transitions} duration={stem.durationSec} position={position} activeFraction={a.gate.activeFraction} />
            </>
          ) : (
            <div className="plot-placeholder">{statusOf(stem)}</div>
          )}
        </div>
      </div>
    </section>
  );
}
