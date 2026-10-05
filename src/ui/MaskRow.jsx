import { bandCentres } from "../dsp/bands.js";

const STEPS = [1, 0.5, 0];

function fmt(f) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : `${Math.round(f)}`;
}

// 16 per-band multipliers, each cycling 1 -> 0.5 -> 0 on click.
export default function MaskRow({ values, onChange, label }) {
  const c = bandCentres();
  return (
    <div className="maskrow" title="Per-band cut multiplier: 1 = full, 0.5 = half, 0 = locked">
      {label ? <span className="maskrow-label">{label}</span> : null}
      {values.map((v, b) => (
        <button
          key={b}
          type="button"
          className={`maskcell m${Math.round(v * 2)}`}
          onClick={() => onChange(b, STEPS[(STEPS.indexOf(v) + 1) % STEPS.length])}
          title={`${fmt(c[b])} Hz: ×${v}`}
        >
          {fmt(c[b])}
        </button>
      ))}
    </div>
  );
}
