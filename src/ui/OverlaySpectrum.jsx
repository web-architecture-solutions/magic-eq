import React, { useMemo } from "react";
import { erbCentres, NUM_ERB } from "../dsp/metrics.js";
import { stemColor } from "./palette.js";

const W = 1000;
const H = 220;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 10;
const STRIP = 16;
const RANGE_DB = 60;

function fmt(f) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : `${Math.round(f)}`;
}

// Every stem's long-term ERB spectrum at mix level, overlaid, with an overlap
// strip: how many stems compete in each band (within 6 dB of the loudest
// there and within 30 dB of their own peak).
export default function OverlaySpectrum({ stems, faders, hoverId, onHover, hidden, onToggle }) {
  const centres = erbCentres();
  const x = (f) => PAD_L + ((Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) * (W - PAD_L - PAD_R);
  const plotH = H - PAD_T - STRIP - 24;

  const data = useMemo(() => {
    const rows = [];
    let top = -Infinity;
    stems.forEach((s, i) => {
      const a = s.analysis;
      if (!a || a.empty || s.status !== "ready") return;
      const raw = a.erb.meanDb;
      const sm = new Float64Array(NUM_ERB);
      for (let b = 0; b < NUM_ERB; b++) {
        const l = raw[Math.max(0, b - 1)];
        const r = raw[Math.min(NUM_ERB - 1, b + 1)];
        sm[b] = (l + 2 * raw[b] + r) / 4 + (faders[i] || 0);
      }
      let peak = -Infinity;
      for (let b = 0; b < NUM_ERB; b++) if (sm[b] > peak) peak = sm[b];
      top = Math.max(top, peak);
      rows.push({ id: s.id, name: s.name, index: i, db: sm, peak });
    });
    const overlap = new Uint8Array(NUM_ERB);
    for (let b = 0; b < NUM_ERB; b++) {
      let loudest = -Infinity;
      for (const r of rows) if (!hidden?.has(r.id) && r.db[b] > loudest) loudest = r.db[b];
      let n = 0;
      for (const r of rows) if (!hidden?.has(r.id) && r.db[b] >= loudest - 6 && r.db[b] >= r.peak - 30) n++;
      overlap[b] = n;
    }
    return { rows, top: Number.isFinite(top) ? top + 3 : 0, overlap };
  }, [stems, faders, hidden]);

  if (data.rows.length === 0) return null;
  const y = (db) => PAD_T + Math.min(plotH, Math.max(0, ((data.top - db) / RANGE_DB) * plotH));
  const maxOverlap = Math.max(1, ...data.overlap);

  return (
    <section className="overlay">
      <div className="overlay-legend">
        {data.rows.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`chip legend-chip${hidden?.has(r.id) ? " off" : ""}${hoverId === r.id ? " on" : ""}`}
            style={{ borderColor: stemColor(r.index) }}
            onMouseEnter={() => onHover?.(r.id)}
            onMouseLeave={() => onHover?.(null)}
            onClick={() => onToggle?.(r.id)}
            title="Click to hide or show this stem in the overlay"
          >
            <span className="swatch" style={{ background: stemColor(r.index) }} />
            {r.name.replace(/\.[^.]+$/, "")}
          </button>
        ))}
        <span className="hint">long-term spectrum at mix level (ERB bands, dB) · strip: stems competing per band</span>
      </div>
      <svg className="overlay-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="All stems' spectra overlaid">
        {[0, -20, -40, -60].map((rel) => (
          <g key={rel}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(data.top + rel)} y2={y(data.top + rel)} className="grid" />
            <text x={PAD_L - 4} y={y(data.top + rel) + 3} className="axis" textAnchor="end">
              {(data.top + rel).toFixed(0)}
            </text>
          </g>
        ))}
        {[50, 100, 200, 500, 1000, 2000, 5000, 10000].map((f) => (
          <g key={f}>
            <line x1={x(f)} x2={x(f)} y1={PAD_T} y2={PAD_T + plotH} className="grid" />
            <text x={x(f)} y={H - 2} className="axis" textAnchor="middle">
              {fmt(f)}
            </text>
          </g>
        ))}
        {data.rows.map((r) => {
          if (hidden?.has(r.id)) return null;
          const pts = Array.from(r.db, (v, b) => `${x(centres[b]).toFixed(1)},${y(v).toFixed(1)}`);
          const line = `M${pts.join(" L")}`;
          const area = `${line} L${x(centres[NUM_ERB - 1]).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${x(centres[0]).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`;
          const dim = hoverId && hoverId !== r.id;
          return (
            <g key={r.id} className={`curve${dim ? " dim" : ""}${hoverId === r.id ? " on" : ""}`}>
              <path d={area} fill={stemColor(r.index)} className="curve-fill" />
              <path d={line} stroke={stemColor(r.index)} className="curve-line" />
            </g>
          );
        })}
        {Array.from(data.overlap, (n, b) => {
          const x0 = b === 0 ? PAD_L : (x(centres[b - 1]) + x(centres[b])) / 2;
          const x1 = b === NUM_ERB - 1 ? W - PAD_R : (x(centres[b]) + x(centres[b + 1])) / 2;
          return (
            <rect key={b} x={x0} y={PAD_T + plotH + 4} width={Math.max(0, x1 - x0)} height={STRIP - 6} className="overlap-cell" style={{ opacity: n <= 1 ? 0.08 : 0.15 + (0.85 * (n - 1)) / Math.max(1, maxOverlap - 1) }}>
              <title>{`${fmt(centres[b])} Hz: ${n} stem${n === 1 ? "" : "s"} competing`}</title>
            </rect>
          );
        })}
      </svg>
    </section>
  );
}
