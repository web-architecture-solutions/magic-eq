// Where a stem is active over the song, with the playhead. This is what the
// gate sees; cuts caused by this stem follow these segments.
export default function ActivityStrip({ transitions, duration, position, activeFraction }) {
  if (!duration) return null;
  const segs = [];
  let on = false;
  let start = 0;
  for (const tr of transitions || []) {
    if (tr.on && !on) {
      on = true;
      start = tr.t;
    } else if (!tr.on && on) {
      on = false;
      segs.push([start, tr.t]);
    }
  }
  if (on) segs.push([start, duration]);
  const x = (t) => `${((t / duration) * 100).toFixed(2)}%`;
  return (
    <div className="activity" title={`Active ${Math.round((activeFraction || 0) * 100)}% of the time. Cuts this stem causes on the others fade in over these segments when Follow activity is on.`}>
      <svg viewBox="0 0 1000 14" preserveAspectRatio="none" className="activity-svg">
        {segs.map(([a, b], i) => (
          <rect key={i} x={(a / duration) * 1000} y={2} width={Math.max(1, ((b - a) / duration) * 1000)} height={10} className="activity-seg" />
        ))}
        {position != null ? <line x1={(position / duration) * 1000} x2={(position / duration) * 1000} y1={0} y2={14} className="playhead" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <span className="activity-label">activity</span>
      <span className="activity-pos" style={{ left: x(position || 0) }} />
    </div>
  );
}
