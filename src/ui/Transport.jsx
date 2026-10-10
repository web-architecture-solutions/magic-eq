function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

const fmt = (v, d = 1) => (Number.isFinite(v) ? `${v > 0 ? "+" : ""}${v.toFixed(d)}` : "–");

// Transport plus the listening comparison: what plays (the raw stems, the
// balanced faders, or the mix with EQ), loudness-matched at a listening
// level by a monitor gain that never reaches the export.
export default function Transport({ engine, canPlay, compare, onCompare, prediction, monitorDb, monitorPeak }) {
  const { playing, position, duration, toggle, seek, meters } = engine;
  const conditions = [
    ["raw", "Raw", "The stems as tracked: every fader at 0 dB, no EQ (key 1)"],
    ["balanced", "Balanced", "The Gain workspace's faders, no EQ (key 2)"],
    ["eq", "EQ", "Faders plus the EQ at its current settings (key 3)"],
  ];
  const L = prediction?.loudness;
  const now = meters?.master;
  const clip = monitorPeak && monitorPeak.rssDb > -1;
  return (
    <section className="transport">
      <button type="button" className="primary" disabled={!canPlay} onClick={toggle} title="Play or stop (space)">
        {playing ? "Stop" : "Play"}
      </button>
      <input
        type="range"
        className="seek"
        min={0}
        max={Math.max(duration, 0.01)}
        step={0.05}
        value={Math.min(position, duration)}
        disabled={!canPlay}
        onChange={(e) => seek(parseFloat(e.target.value))}
      />
      <span className="time">
        {fmtTime(position)} / {fmtTime(duration)}
      </span>
      <div className="tabs compare" role="radiogroup" aria-label="Listen to">
        {conditions.map(([key, label, title]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={compare.condition === key}
            className={`tab${compare.condition === key ? " on" : ""}`}
            disabled={!canPlay}
            onClick={() => onCompare({ condition: key })}
            title={`${title}. Predicted mix loudness ${L ? fmt(L[key]) : "–"} LUFS before matching.`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="tog-label match" title="Play every condition at the same predicted integrated loudness (BS.1770), so louder never wins by default. Monitoring only: exports are unaffected.">
        <input type="checkbox" checked={compare.match} onChange={(e) => onCompare({ match: e.target.checked })} />
        match at
        <input
          type="number"
          className="listen-lufs"
          min={-36}
          max={-8}
          step={1}
          value={compare.listenLufs}
          disabled={!compare.match}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onCompare({ listenLufs: Math.max(-36, Math.min(-8, v)) });
          }}
        />
        LUFS
      </label>
      <span
        className={`loudness${clip ? " warn" : ""}`}
        title={`Short-term loudness (3 s, BS.1770) of what you hear, after the monitor gain. Monitor gain ${fmt(monitorDb)} dB. Predicted before matching: raw ${L ? fmt(L.raw) : "–"}, balanced ${L ? fmt(L.balanced) : "–"}, EQ ${L ? fmt(L.eq) : "–"} LUFS.${clip ? " The predicted peak at this level is above -1 dBFS: lower the listening level." : ""}`}
      >
        {playing && now && Number.isFinite(now.lufsS) ? `${now.lufsS.toFixed(1)} LUFS` : "– LUFS"}
        {clip ? " · may clip" : ""}
      </span>
    </section>
  );
}
