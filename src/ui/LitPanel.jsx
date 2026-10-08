import { LIT_PARAMS, NOT_IMPLEMENTED } from "./litParams.js";

function Tag({ p }) {
  return (
    <span className={`prov prov-${p.provenance}`} title={p.source}>
      {p.provenance}
    </span>
  );
}

function Row({ k, knobs, dispatch, children }) {
  const p = LIT_PARAMS[k];
  return (
    <label className="slider lit-row" title={`${p.name}: ${p.long} Source: ${p.source}`}>
      <span className="slider-label">
        {p.name} <Tag p={p} />
      </span>
      {children}
    </label>
  );
}

function Range({ k, knobs, dispatch, min, max, step, unit = "" }) {
  const v = knobs[k];
  return (
    <Row k={k} knobs={knobs} dispatch={dispatch}>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => dispatch({ type: "SET_KNOB", key: k, value: parseFloat(e.target.value) })} />
      <span className="slider-value">
        {Number(v).toFixed(step < 1 ? 2 : 0)}
        {unit}
      </span>
    </Row>
  );
}

function Toggle({ k, knobs, dispatch }) {
  return (
    <Row k={k} knobs={knobs} dispatch={dispatch}>
      <input type="checkbox" checked={!!knobs[k]} onChange={(e) => dispatch({ type: "SET_KNOB", key: k, value: e.target.checked })} />
      <span />
    </Row>
  );
}

function Select({ k, knobs, dispatch, options }) {
  return (
    <Row k={k} knobs={knobs} dispatch={dispatch}>
      <select value={knobs[k]} onChange={(e) => dispatch({ type: "SET_KNOB", key: k, value: e.target.value })}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <span />
    </Row>
  );
}

// Controls for the literature flow, grouped by paper, each tagged with its
// provenance. Hover any row for the source.
export default function LitPanel({ knobs, dispatch, curves }) {
  const lm = curves?.litMasking;
  return (
    <div className="lit">
      <div className="lit-col">
        <h2>Hafezi &amp; Reiss 2015 · masking reduction</h2>
        <Range k="litAmount" knobs={knobs} dispatch={dispatch} min={0} max={1} step={0.05} />
        <Toggle k="litMasking" knobs={knobs} dispatch={dispatch} />
        <Select k="litCutTarget" knobs={knobs} dispatch={dispatch} options={[["masker", "the masker where it dominates (paper)"], ["maskee", "the maskee where it loses (Magic)"]]} />
        <Range k="litEssentialDb" knobs={knobs} dispatch={dispatch} min={3} max={30} step={1} unit=" dB" />
        <Range k="litTopK" knobs={knobs} dispatch={dispatch} min={1} max={8} step={1} />
        <Range k="litQ" knobs={knobs} dispatch={dispatch} min={0.5} max={6} step={0.1} />
        <Range k="litMaxCut" knobs={knobs} dispatch={dispatch} min={1} max={24} step={1} unit=" dB" />
      </div>
      <div className="lit-col">
        <h2>Perez-Gonzalez &amp; Reiss 2009 · spectral balance</h2>
        <Toggle k="litBalance" knobs={knobs} dispatch={dispatch} />
        <Select k="litBalanceWeighting" knobs={knobs} dispatch={dispatch} options={[["a", "A-weighting (≈ ISO 226, 40 phon)"], ["none", "none"]]} />
        <Toggle k="litBalanceBoosts" knobs={knobs} dispatch={dispatch} />
        <h2>De Man &amp; Reiss 2013 · rules</h2>
        <Toggle k="litHpf" knobs={knobs} dispatch={dispatch} />
        <Range k="litHpfHz" knobs={knobs} dispatch={dispatch} min={20} max={200} step={5} unit=" Hz" />
        <h2>Ours</h2>
        <Toggle k="litMakeup" knobs={knobs} dispatch={dispatch} />
        {lm ? (
          <div className="lit-metric" title="Sum over masking occurrences (masker louder in a band essential for the maskee and nonessential for the masker) of the masking value in dB, before and after the EQ. The paper's own kind of objective measure.">
            masking (paper's measure): {lm.before.toFixed(0)} → {lm.after.toFixed(0)} dB·occ
          </div>
        ) : null}
        <details className="lit-notes">
          <summary>Not implemented (and why)</summary>
          <ul>
            {NOT_IMPLEMENTED.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
