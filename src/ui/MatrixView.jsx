import { bandCentres } from "../dsp/bands.js";

function short(n) {
  return n.replace(/\.[^.]+$/, "").slice(0, 14);
}

function fmtHz(f) {
  return f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)} kHz` : `${Math.round(f)} Hz`;
}

// Who masks whom, read-only, in the terms of Hafezi & Reiss (2015): a
// masking occurrence is a band where the masker is louder, the band is
// essential for the maskee and nonessential for the masker. The matrix
// averages the masking value over the maskee's audible bands; the list
// shows the occurrences the EQ acts on (the strongest per stem).
export default function MatrixView({ stems, curves, knobs }) {
  if (stems.length < 2) return <p className="hint">Load at least two stems to see who masks whom.</p>;
  const idx = new Map(stems.map((s, i) => [s.id, i]));
  const contrib = (masker, maskee) => curves?.pairContribution?.[idx.get(maskee.id)]?.[idx.get(masker.id)] ?? 0;
  const rowTotal = (src) => stems.reduce((acc, t) => (t.id === src.id ? acc : acc + contrib(src, t)), 0) / Math.max(1, stems.length - 1);
  const colTotal = (tgt) => stems.reduce((acc, s) => (s.id === tgt.id ? acc : acc + contrib(s, tgt)), 0) / Math.max(1, stems.length - 1);
  const shade = (v) => ({ background: `rgba(217, 89, 38, ${(0.08 + 0.72 * Math.min(1, v)).toFixed(3)})` });
  const centres = bandCentres();
  const occ = (curves?.occurrences || []).filter((o) => o.selected).sort((a, b) => b.m - a.m);
  const cutOn = knobs.litCutTarget === "maskee" ? "maskee" : "masker";
  const name = (i) => short(stems[i]?.name ?? "?");
  const lm = curves?.litMasking;

  return (
    <div className="matrix-view">
      <p className="hint">
        Row masks column. Colour: the masking value of the row stem over the column stem (how much louder it is in bands essential for the column and nonessential for the row), averaged over the column's audible range and scaled by the max cut, at the current faders.
      </p>
      <table className="matrix">
        <thead>
          <tr>
            <th className="corner">masks ↓ · masked →</th>
            {stems.map((t) => (
              <th key={t.id} title={t.name}>
                {short(t.name)}
              </th>
            ))}
            <th className="margin">masks others</th>
          </tr>
        </thead>
        <tbody>
          {stems.map((s) => (
            <tr key={s.id}>
              <th title={s.name}>{short(s.name)}</th>
              {stems.map((t) =>
                s.id === t.id ? (
                  <td key={t.id} className="diag" />
                ) : (
                  <td key={t.id} style={shade(contrib(s, t))} className="num" title={`${short(s.name)} masks ${short(t.name)}: ${(contrib(s, t) * 100).toFixed(0)}% of the max cut, averaged over its audible range`}>
                    {contrib(s, t) > 0.005 ? (contrib(s, t) * 100).toFixed(0) : ""}
                  </td>
                )
              )}
              <td className="margin num">{(rowTotal(s) * 100).toFixed(0)}%</td>
            </tr>
          ))}
          <tr>
            <th className="margin">is masked</th>
            {stems.map((t) => (
              <td key={t.id} className="margin num">
                {(colTotal(t) * 100).toFixed(0)}%
              </td>
            ))}
            <td className="diag" />
          </tr>
        </tbody>
      </table>

      <h3>Occurrences the EQ acts on</h3>
      <p className="hint">
        The strongest {knobs.litTopK} per stem, one filter per band, cut on the {cutOn} by Amount × masking value.
        {lm ? ` Summed masking value: ${lm.before.toFixed(1)} before, ${lm.after.toFixed(1)} after (dB over all ${curves.occurrences.length} occurrences).` : ""}
      </p>
      {occ.length === 0 ? (
        <p className="hint">No masking occurrences at these faders and settings.</p>
      ) : (
        <table className="occurrences">
          <thead>
            <tr>
              <th>masker</th>
              <th>maskee</th>
              <th>band</th>
              <th>masking value</th>
              <th>cut on {cutOn}</th>
            </tr>
          </thead>
          <tbody>
            {occ.map((o, k) => {
              const t = cutOn === "maskee" ? o.j : o.i;
              return (
                <tr key={k}>
                  <td>{name(o.i)}</td>
                  <td>{name(o.j)}</td>
                  <td className="num">{fmtHz(centres[o.b])}</td>
                  <td className="num">{o.m.toFixed(1)} dB</td>
                  <td className="num">{(curves.G[t]?.[o.b] ?? 0).toFixed(1)} dB</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
