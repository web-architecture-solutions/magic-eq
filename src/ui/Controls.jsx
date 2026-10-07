import { PARAMS, titleOf } from "./params.js";

export function Label({ k, text }) {
  const p = PARAMS[k];
  return (
    <span className="slider-label" title={titleOf(k)}>
      {text ?? p?.name ?? k}
      {p?.symbol ? <span className="sym"> {p.symbol}</span> : null}
    </span>
  );
}

export function Slider({ k, label, value, min, max, step, onChange, unit, disabled }) {
  const u = unit ?? PARAMS[k]?.unit ?? "";
  const digits = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return (
    <label className="slider" title={titleOf(k)}>
      <Label k={k} text={label} />
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="slider-value">
        {Number(value).toFixed(digits)}
        {u && u !== "×" ? ` ${u}` : u}
      </span>
    </label>
  );
}

export function Check({ k, label, checked, onChange }) {
  return (
    <label className="check" title={titleOf(k)}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /> {label ?? PARAMS[k]?.name ?? k}
    </label>
  );
}
