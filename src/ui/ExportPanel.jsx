import { downloadBlob, downloadAll } from "../audio/exportAll.js";

export default function ExportPanel({ exportState, canExport, onExport, trimMix, onTrimMix }) {
  const { status, progress, files, error } = exportState;
  return (
    <section className="panel">
      <h2>Export</h2>
      <p className="hint">Renders each stem through its EQ (gate automation included) at source level, plus the mix at fader level, and the recipe.</p>
      <label className="check" title="Scale the summed mix down to -1 dBFS peak if it would clip; stems are never scaled.">
        <input type="checkbox" checked={trimMix} onChange={(e) => onTrimMix(e.target.checked)} /> trim mix to -1 dBFS if it clips
      </label>
      <button type="button" className="primary" disabled={!canExport || status === "running"} onClick={onExport}>
        {status === "running" ? `Rendering… ${progress?.done ?? 0}/${progress?.total ?? "?"}` : "Render & export"}
      </button>
      {progress?.label && status === "running" ? <div className="hint">{progress.label}</div> : null}
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
    </section>
  );
}
