import { bandCentres, NUM_BANDS } from "../dsp/bands.js";

const W = 520;
const H1 = 120;
const H2 = 64;
const PAD_L = 34;
const PAD_R = 8;
const GAP = 18;
const SPEC_FLOOR = -60;

function fmt(f) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : `${Math.round(f)}`;
}

// Two stacked panels on one SVG: the stem's spectrum (bars, dB relative to
// its own peak) with its mode envelope, and the derived cut per band. `live`
// (optional) is the instantaneous gated cut during playback, drawn lighter.
export default function SpectrumPlot({ S, E, G, unclamped, terms, live, maxCut, knee = 0.25, audible }) {
  const centres = bandCentres();
  const plotW = W - PAD_L - PAD_R;
  const bw = plotW / NUM_BANDS;
  const yS = (db) => (Math.min(0, Math.max(SPEC_FLOOR, db)) / SPEC_FLOOR) * H1;
  const cutScale = Math.max(1, maxCut || 6);
  const yG = (db) => (Math.min(0, Math.max(-cutScale, db)) / -cutScale) * H2;
  const top2 = H1 + GAP;
  const total = H1 + GAP + H2 + 18;
  const kneeDb = knee > 0 ? (1 - knee) * cutScale : cutScale;

  const envPath = E ? Array.from(E, (v, b) => `${b === 0 ? "M" : "L"}${(PAD_L + (b + 0.5) * bw).toFixed(1)},${yS(v).toFixed(1)}`).join(" ") : "";

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
            <rect key={b} x={PAD_L + b * bw + 1} y={y} width={bw - 2} height={Math.max(0, H1 - y)} className={`bar-spec${audible && !audible[b] ? " dim" : ""}`} rx={2}>
              <title>{`${fmt(centres[b])} Hz: ${v.toFixed(1)} dB rel. peak${audible ? (audible[b] ? " (audible range)" : " (below audible range)") : ""}`}</title>
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
      {knee > 0 ? <line x1={PAD_L} x2={W - PAD_R} y1={top2 + yG(-kneeDb)} y2={top2 + yG(-kneeDb)} className="grid knee" /> : null}
      {G &&
        Array.from(G, (v, b) => {
          const y = yG(v);
          const u = unclamped ? unclamped[b] : v;
          const held = u < -kneeDb - 0.01;
          const lv = live ? live[b] : null;
          const scale = u < 0 ? v / u : 0;
          const parts = terms
            ? [
                ["cross", terms.cross?.[b] ?? 0],
                ["level", terms.level?.[b] ?? 0],
                ["scoop", terms.scoop?.[b] ?? 0],
              ]
            : [["cross", v]];
          let acc = 0;
          const segs = parts.map(([name, t]) => {
            const from = acc;
            acc += t * scale;
            return [name, from, acc];
          });
          const detail = terms ? ` (depth ${(terms.cross?.[b] ?? 0).toFixed(2)}, peak taming ${(terms.level?.[b] ?? 0).toFixed(2)}, valley cut ${(terms.scoop?.[b] ?? 0).toFixed(2)})` : "";
          return (
            <g key={b}>
              <rect x={PAD_L + b * bw + 1} y={top2} width={bw - 2} height={Math.max(0, y)} className="bar-cut-hit" rx={2}>
                <title>{`${fmt(centres[b])} Hz: cut ${v.toFixed(2)} dB${detail}${held ? ` (held by the ceiling; would be ${u.toFixed(2)})` : ""}${lv != null ? `; right now ${lv.toFixed(2)} dB` : ""}`}</title>
              </rect>
              {segs.map(([name, from, to]) =>
                to < from - 1e-6 ? <rect key={name} x={PAD_L + b * bw + 1} y={top2 + yG(from)} width={bw - 2} height={Math.max(0, yG(to) - yG(from))} className={`seg seg-${name}`} rx={1} /> : null
              )}
              {lv != null && Math.abs(lv - v) > 0.05 ? <rect x={PAD_L + b * bw + 1} y={top2} width={bw - 2} height={Math.max(0, yG(lv))} className="bar-live" rx={2} /> : null}
              {held ? <line x1={PAD_L + b * bw + 2} x2={PAD_L + (b + 1) * bw - 2} y1={top2 + H2 - 1.5} y2={top2 + H2 - 1.5} className="cap" /> : null}
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
      <text x={PAD_L} y={H1 + 12} className="legend" textAnchor="start">
        <tspan className="sw-spec">■</tspan> spectrum (dB rel. peak) <tspan className="sw-env">—</tspan> modes
      </text>
      <text x={W - PAD_R} y={H1 + 12} className="legend" textAnchor="end">
        <tspan className="sw-cross">■</tspan> depth <tspan className="sw-level">■</tspan> peak taming <tspan className="sw-scoop">■</tspan> valley cut{live ? " " : ""}
        {live ? <tspan className="sw-live">■</tspan> : null}
        {live ? " now" : ""}
      </text>
    </svg>
  );
}
