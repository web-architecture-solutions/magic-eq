import { bandCentres, NUM_BANDS } from "../dsp/bands.js";

const W = 520;
const H1 = 120;
const H2 = 64;
const PAD_L = 34;
const PAD_R = 8;
const GAP = 14;
const SPEC_FLOOR = -60;

function fmt(f) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : `${Math.round(f)}`;
}

// Two stacked panels on one SVG: the stem's spectrum (bars, dB relative to
// its own peak) with its mode envelope, and the derived cut per band.
export default function SpectrumPlot({ S, E, G, unclamped, maxCut }) {
  const centres = bandCentres();
  const plotW = W - PAD_L - PAD_R;
  const bw = plotW / NUM_BANDS;
  const yS = (db) => (Math.min(0, Math.max(SPEC_FLOOR, db)) / SPEC_FLOOR) * H1;
  const cutScale = Math.max(1, maxCut || 6);
  const yG = (db) => (Math.min(0, Math.max(-cutScale, db)) / -cutScale) * H2;
  const top2 = H1 + GAP;
  const total = H1 + GAP + H2 + 18;

  const envPath = E
    ? Array.from(E, (v, b) => `${b === 0 ? "M" : "L"}${(PAD_L + (b + 0.5) * bw).toFixed(1)},${yS(v).toFixed(1)}`).join(" ")
    : "";

  return (
    <svg className="plot" viewBox={`0 0 ${W} ${total}`} role="img" aria-label="Spectrum and derived cut per band">
      {[0, -20, -40, -60].map((db) => (
        <g key={db}>
          <line x1={PAD_L} x2={W - PAD_R} y1={yS(db)} y2={yS(db)} className="grid" />
          <text x={PAD_L - 4} y={Math.max(8, yS(db) + 3)} className="axis" textAnchor="end">
            {db}
          </text>
        </g>
      ))}
      {S &&
        Array.from(S, (v, b) => {
          const y = yS(v);
          return (
            <rect
              key={b}
              x={PAD_L + b * bw + 1}
              y={y}
              width={bw - 2}
              height={Math.max(0, H1 - y)}
              className="bar-spec"
              rx={2}
            >
              <title>{`${fmt(centres[b])} Hz: ${v.toFixed(1)} dB rel. peak`}</title>
            </rect>
          );
        })}
      {envPath ? <path d={envPath} className="line-env" /> : null}

      {[0, -cutScale / 2, -cutScale].map((db) => (
        <g key={db}>
          <line x1={PAD_L} x2={W - PAD_R} y1={top2 + yG(db)} y2={top2 + yG(db)} className="grid" />
          <text x={PAD_L - 4} y={Math.max(top2 + 8, top2 + yG(db) + 3)} className="axis" textAnchor="end">
            {db.toFixed(0)}
          </text>
        </g>
      ))}
      {G &&
        Array.from(G, (v, b) => {
          const y = yG(v);
          const u = unclamped ? unclamped[b] : v;
          return (
            <g key={b}>
              <rect
                x={PAD_L + b * bw + 1}
                y={top2}
                width={bw - 2}
                height={Math.max(0, y)}
                className="bar-cut"
                rx={2}
              >
                <title>{`${fmt(centres[b])} Hz: cut ${v.toFixed(2)} dB${u < v - 0.01 ? ` (would be ${u.toFixed(2)} before clamp)` : ""}`}</title>
              </rect>
              {u < v - 0.01 ? (
                <text x={PAD_L + (b + 0.5) * bw} y={top2 + H2 - 3} className="clamp" textAnchor="middle">
                  !
                </text>
              ) : null}
            </g>
          );
        })}
      {Array.from(centres, (f, b) =>
        b % 2 === 0 ? (
          <text key={b} x={PAD_L + (b + 0.5) * bw} y={total - 4} className="axis" textAnchor="middle">
            {fmt(f)}
          </text>
        ) : null
      )}
      <text x={W - PAD_R} y={10} className="legend" textAnchor="end">
        <tspan className="sw-spec">■</tspan> spectrum <tspan className="sw-env">—</tspan> modes
      </text>
      <text x={W - PAD_R} y={top2 + 10} className="legend" textAnchor="end">
        <tspan className="sw-cut">■</tspan> cut (dB)
      </text>
    </svg>
  );
}
