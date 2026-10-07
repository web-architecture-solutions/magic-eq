function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

export default function Transport({ engine, canPlay, mixBypass, onMixBypass, masking }) {
  const { playing, position, duration, toggle, seek } = engine;
  return (
    <section className="transport">
      <button type="button" className="primary" disabled={!canPlay} onClick={toggle}>
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
      <button
        type="button"
        className={`tog${mixBypass ? " on" : ""}`}
        disabled={!canPlay}
        onClick={() => onMixBypass(!mixBypass)}
        title="Bypass every stem's EQ at matched loudness"
      >
        Bypass all
      </button>
      {masking ? (
        <span className="masking" title="Crude masking score: sum over stem pairs and bands of the overlapping power after the cuts, relative to before. More negative is less overlap.">
          overlap {masking.ratioDb.toFixed(2)} dB
        </span>
      ) : null}
    </section>
  );
}
