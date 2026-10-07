import { downloadBlob, downloadAll } from "../audio/exportAll.js";

export default function ExportModal({ open, onClose, exportState, canExport, onExport, trimMix, onTrimMix, stemCount }) {
  if (!open) return null;
  const { status, progress, files, error, evaluation } = exportState;
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  const db = (x) => `${x >= 0 ? "+" : ""}${x.toFixed(2)} dB`;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Export">
        <header className="modal-head">
          <h2>Export</h2>
          <span className="spacer" />
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="hint">
          Renders each of the {stemCount} stems through its EQ (activity following included) at source level, the mix at fader level, and <code>recipe.json</code> with the per-band gains and the automation.
        </p>
        <label className="check" title="Scale the summed mix down to -1 dBFS peak if it would clip; stems are never scaled.">
          <input type="checkbox" checked={trimMix} onChange={(e) => onTrimMix(e.target.checked)} /> trim mix to -1 dBFS if it clips
        </label>
        <div className="modal-actions">
          <button type="button" className="primary" disabled={!canExport || status === "running"} onClick={onExport}>
            {status === "running" ? `Rendering… ${progress?.done ?? 0}/${progress?.total ?? "?"}` : "Render"}
          </button>
          {!canExport ? <span className="hint">waiting for every stem to finish analysing</span> : null}
          {progress?.label && status === "running" ? <span className="hint">{progress.label}</span> : null}
        </div>
        {error ? <div className="warn">{error}</div> : null}
        {evaluation ? (
          <div className="evaluation">
            <h3 title="ERB-band signal-to-masker ratio on the rendered audio: masker = the other stems at mix level, spread across neighbouring bands. 'Masked' counts a stem's own time-frequency cells more than 6 dB under its masker. Lower masked and higher SMR after is better. Level balance dominates this number; EQ moves it a little.">
              Objective masking, before → after
            </h3>
            <div className="eval-total">
              masked {pct(evaluation.total.maskedBefore)} → {pct(evaluation.total.maskedAfter)} · mean SMR {db(evaluation.total.smrBefore)} → {db(evaluation.total.smrAfter)}
            </div>
            <table className="eval">
              <thead>
                <tr>
                  <th>stem</th>
                  <th>masked</th>
                  <th>mean SMR</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.stems.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>
                      {pct(s.maskedBefore)} → {pct(s.maskedAfter)}
                    </td>
                    <td>
                      {db(s.smrBefore)} → {db(s.smrAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {files.length ? (
          <div className="files">
            <button type="button" onClick={() => downloadAll(files)}>
              Download all ({files.length})
            </button>
            <ul>
              {files.map((f) => (
                <li key={f.name}>
                  <button type="button" className="link" onClick={() => downloadBlob(f.blob, f.name)}>
                    {f.name}
                  </button>
                  <span className="hint"> {(f.blob.size / 1048576).toFixed(1)} MB</span>
                  {f.clippedSamples ? <span className="warn"> {f.clippedSamples} clipped samples</span> : null}
                  {f.trimDb ? <span className="hint"> trimmed {f.trimDb.toFixed(1)} dB</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
