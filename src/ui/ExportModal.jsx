import { downloadBlob, downloadAll } from "../audio/exportAll.js";

export default function ExportModal({ open, onClose, exportState, canExport, onExport, trimMix, onTrimMix, stemCount }) {
  if (!open) return null;
  const { status, progress, files, error } = exportState;
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
