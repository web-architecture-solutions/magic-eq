import { ROLES, roleLabel } from "../dsp/roles.js";
import { Slider } from "./Controls.jsx";
import { titleOf, PARAMS } from "./params.js";
import { stemColor } from "./palette.js";

const fmtDb = (v, d = 1) => (Number.isFinite(v) ? `${v >= 0 ? "+" : ""}${v.toFixed(d)}` : "–");

function Meter({ rmsDb, peakDb, floor = -60, markDb = -6 }) {
  const w = (db) => `${Math.max(0, Math.min(100, ((db - floor) / -floor) * 100)).toFixed(1)}%`;
  return (
    <div className="meter" title={rmsDb != null ? `RMS ${rmsDb.toFixed(1)} dBFS, peak ${peakDb.toFixed(1)} dBFS (mono average)` : "plays to show levels"}>
      <div className="meter-rms" style={{ width: rmsDb != null ? w(rmsDb) : 0 }} />
      <div className="meter-peak" style={{ left: peakDb != null ? w(peakDb) : 0, opacity: peakDb != null ? 1 : 0 }} />
      <div className="meter-zero" style={{ left: w(markDb) }} />
    </div>
  );
}

function FaderStrip({ stem, index, meter, knobs, dispatch, muted }) {
  const set = (patch) => dispatch({ type: "SET_STEM", id: stem.id, patch });
  const a = stem.analysis;
  const ready = stem.status === "ready" && a;
  const fader = (stem.autoFaderDb ?? 0) + (stem.trimDb ?? 0);
  return (
    <div className={`strip${muted ? " muted" : ""}`}>
      <div className="strip-head">
        <span className="swatch" style={{ background: stemColor(index) }} />
        <strong title={stem.name}>{stem.name.replace(/\.[^.]+$/, "")}</strong>
      </div>
      <select className="role" value={stem.role} onChange={(e) => set({ role: e.target.value })} title={titleOf("roleOffsets")}>
        {ROLES.map(([r, label]) => (
          <option key={r} value={r}>
            {label}
          </option>
        ))}
      </select>
      <div className="strip-readouts">
        <span title="Integrated loudness of the stem on its own (ITU BS.1770, gated)">{ready && Number.isFinite(a.lufs) ? `${a.lufs.toFixed(1)} LUFS` : "–"}</span>
        <span title="Sample peak of the stem on its own">{ready && Number.isFinite(a.samplePeakDb) ? `pk ${a.samplePeakDb.toFixed(1)}` : ""}</span>
        <span title="Loudness after the fader">{ready && Number.isFinite(a.lufs) ? `→ ${(a.lufs + fader).toFixed(1)}` : ""}</span>
      </div>
      <Slider k="trimDb" label="Trim" value={stem.trimDb ?? 0} min={-24} max={12} step={0.5} onChange={(v) => set({ trimDb: v })} />
      <div className="strip-fader" title="Automatic fader from Balance plus your trim">
        <span className="hint">auto {stem.autoFaderDb != null ? fmtDb(stem.autoFaderDb) : "–"}</span>
        <strong>{fmtDb(fader)} dB</strong>
      </div>
      <Meter rmsDb={meter?.rmsDb ?? null} peakDb={meter?.peakDb ?? null} />
      <div className="strip-buttons">
        <button type="button" className={`tog${stem.mute ? " on" : ""}`} onClick={() => set({ mute: !stem.mute })}>
          M
        </button>
        <button type="button" className={`tog${stem.solo ? " on" : ""}`} onClick={() => set({ solo: !stem.solo })}>
          S
        </button>
      </div>
    </div>
  );
}

export default function GainView({ stems, knobs, dispatch, meters, muted, onBalance, headroom, masterTrimDb, lastBalance, allReady, compare }) {
  const method = knobs.balanceMethod || "loudness";
  const suggestion = headroom?.suggestedTrimDb ?? 0;
  const target = knobs.peakTargetDb ?? -6;
  return (
    <div className="gain">
      <div className="gain-toolbar">
        <label className="slider" title={titleOf("balanceMethod")}>
          <span className="slider-label">{PARAMS.balanceMethod.name}</span>
          <select value={method} onChange={(e) => dispatch({ type: "SET_KNOB", key: "balanceMethod", value: e.target.value })}>
            <option value="loudness">Loudness + role offsets</option>
            <option value="peakBand">Peak band</option>
            <option value="pink">Pink reference</option>
          </select>
          <span />
        </label>
        <Slider k="targetLufs" value={knobs.targetLufs} min={-40} max={-6} step={1} onChange={(v) => dispatch({ type: "SET_KNOB", key: "targetLufs", value: v })} />
        <button type="button" className="primary" disabled={!allReady} onClick={onBalance} title="Set every stem's automatic fader from the analysis; trims are kept; the loudest resulting fader lands at 0 dB">
          Balance
        </button>
        <button type="button" onClick={() => dispatch({ type: "RESET_TRIMS" })}>
          Reset trims
        </button>
        <button type="button" onClick={() => dispatch({ type: "CLEAR_BALANCE" })} disabled={!lastBalance}>
          Clear
        </button>
        {knobs.postFader ? <span className="warn">Stems are post-fader is on: faders are ignored. Balance turns it off.</span> : null}
        {lastBalance ? <span className="hint">balanced by {lastBalance.method}; anchored by {fmtDb(lastBalance.shiftDb)} dB</span> : null}
      </div>
      <div className="gain-master">
        <div className="headroom" title="Predicted mix peak from the stems' per-frame peaks at the current faders: coherent sum (upper bound) and root-sum-square (uncorrelated estimate). The live meter during playback is the truth.">
          <span>predicted peak {headroom ? `${fmtDb(headroom.upperDb)} (bound) · ${fmtDb(headroom.rssDb)} (est.)` : "–"} dBFS</span>
          <label className="peak-target" title="Where the aim button puts the predicted mix peak (coherent bound). -6 dBFS leaves room for later processing; 0 uses the full scale.">
            peak target
            <input
              type="number"
              min={-24}
              max={0}
              step={1}
              value={target}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) dispatch({ type: "SET_KNOB", key: "peakTargetDb", value: Math.max(-24, Math.min(0, v)) });
              }}
            />
            dBFS
          </label>
          <button type="button" disabled={!headroom || Math.abs(suggestion - masterTrimDb) < 0.05} onClick={() => dispatch({ type: "SET_MASTER_TRIM", value: suggestion })} title={`Set the master trim so the predicted peak sits at ${target} dBFS`}>
            aim ({fmtDb(suggestion)})
          </button>
        </div>
        <Slider k="masterTrimDb" value={masterTrimDb} min={-24} max={6} step={0.5} onChange={(v) => dispatch({ type: "SET_MASTER_TRIM", value: v })} />
        <div className="master-meter">
          <span className="slider-label">master</span>
          <Meter rmsDb={meters?.master?.rmsDb ?? null} peakDb={meters?.master?.peakDb ?? null} markDb={target} />
        </div>
        {compare?.match ? (
          <span className="hint" title="The transport's match plays every condition (raw, balanced, with EQ) at the same loudness through a monitor gain after the master trim.">
            listening is loudness-matched at {compare.listenLufs} LUFS: the master trim changes the export, not what you hear
          </span>
        ) : null}
      </div>
      <div className="strips">
        {stems.map((s, i) => (
          <FaderStrip key={s.id} stem={s} index={i} meter={meters?.stems?.[s.id]} knobs={knobs} dispatch={dispatch} muted={muted[i]} />
        ))}
      </div>
      <p className="hint">
        Loudness is ITU BS.1770 integrated (K-weighted, gated) per stem; Balance equalises it to the target plus the role offset, then shifts everything so nothing is boosted above 0 dB. Trims are yours and survive a re-balance. Roles were guessed from file names; the offsets live in Settings. ({roleLabel("leadVocal")} on top, cymbals and room mics lowest.)
      </p>
    </div>
  );
}
