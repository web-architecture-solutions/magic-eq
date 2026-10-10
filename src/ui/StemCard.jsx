import React from "react";
import { Slider } from "./Controls.jsx";
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

// One stem: mixer controls, readouts, its spectrum and its EQ.
export default function StemCard({ stem, index, curves, muted, knobs, dispatch, onRemove, position, needsReanalysis, onHover, color }) {
  const set = (patch) => dispatch({ type: "SET_STEM", id: stem.id, patch });
  const faderDb = (stem.autoFaderDb ?? 0) + (stem.trimDb ?? 0);
  const a = stem.analysis;
  const ready = stem.status === "ready" && a && !a.empty;
  const effect = curves?.effect?.[index] ?? 0;
  const ceiling = curves?.ceilingBands?.[index] ?? 0;
  const makeup = curves?.makeupDb?.[index] ?? 0;
  const hpf = curves?.hpfHz?.[index] ?? 0;

  return (
    <section className={`stem${muted ? " muted" : ""}`} onMouseEnter={onHover ? () => onHover(stem.id) : undefined} onMouseLeave={onHover ? () => onHover(null) : undefined}>
      <header className="stem-head">
        {color ? <span className="swatch" style={{ background: color }} /> : null}
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
        <button type="button" className="remove" onClick={onRemove} title="Remove stem">
          ×
        </button>
      </header>

      <div className="stem-body">
        <div className="stem-controls">
          <Slider
            k="fader"
            label={stem.autoFaderDb != null ? `Fader (auto ${stem.autoFaderDb.toFixed(1)})` : undefined}
            value={knobs.postFader ? 0 : faderDb}
            min={-40}
            max={12}
            step={0.5}
            disabled={knobs.postFader}
            onChange={(v) => set({ trimDb: v - (stem.autoFaderDb ?? 0) })}
          />
          <div className="readouts">
            <span title="Spread of the EQ across this stem's audible range: highest minus lowest band gain.">effect {effect.toFixed(1)} dB</span>
            {ceiling ? <span className="warn" title="Audible bands whose cut is held by the max cut.">{ceiling} at max cut</span> : null}
            <span title={titleOf("makeup")}>make-up {makeup.toFixed(1)} dB</span>
            {hpf > 0 ? <span title="High-pass by role (De Man & Reiss 2013 rule family)">HPF {hpf} Hz</span> : null}
            <span title="Role used for the level offset and the high-pass; change it in the Gain workspace.">{stem.role}</span>
          </div>
        </div>
        <div className="stem-plot">
          {ready ? (
            <>
              <SpectrumPlot S={a.S} G={curves?.G?.[index]} unclamped={curves?.unclamped?.[index]} terms={curves ? { cross: curves.crossTerm?.[index], level: curves.levelTerm?.[index] } : null} maxCut={knobs.litMaxCut} audible={curves?.audible?.[index]} />
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
