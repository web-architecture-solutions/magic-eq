import { titleOf } from "./params.js";

function short(n) {
  return n.replace(/\.[^.]+$/, "").slice(0, 14);
}

// Who carves whom. Rows are sources, columns are targets. Cell colour is the
// measured dominance of the row stem over the column stem across the column
// stem's audible range (0..1); the number inside is the editable pair weight.
export default function MatrixView({ stems, curves, pairById, dispatch, knobs }) {
  const presenceMode = knobs?.driveMode !== "multiplier";
  if (stems.length < 2) return <p className="hint">Load at least two stems to see the matrix.</p>;
  const idx = new Map(stems.map((s, i) => [s.id, i]));
  const contrib = (src, tgt) => curves?.pairContribution?.[idx.get(tgt.id)]?.[idx.get(src.id)] ?? 0;
  const rowTotal = (src) => stems.reduce((acc, t) => (t.id === src.id ? acc : acc + contrib(src, t)), 0) / Math.max(1, stems.length - 1);
  const colTotal = (tgt) => stems.reduce((acc, s) => (s.id === tgt.id ? acc : acc + contrib(s, tgt)), 0) / Math.max(1, stems.length - 1);
  const shade = (v) => ({ background: `rgba(217, 89, 38, ${(0.08 + 0.72 * Math.min(1, v)).toFixed(3)})` });

  return (
    <div className="matrix-view">
      <p className="hint">
        Row carves column. Colour: how much the row stem dominates the column stem across the column stem's audible range, at the current faders, presence and selectivity. Number: pair weight (blank = 1), multiplied with
        {presenceMode ? " the column's " : " the row's "}
        {presenceMode ? <em>accepts cuts</em> : <em>carves others</em>}
        {presenceMode ? ". The margin sets each stem's presence: an analysis-only level offset in the contest." : " and the column's "}
        {presenceMode ? null : <em>accepts cuts</em>}
        {presenceMode ? null : "."}
      </p>
      <table className="matrix">
        <thead>
          <tr>
            <th className="corner">carves ↓ · accepts →</th>
            {stems.map((t) => (
              <th key={t.id} title={t.name}>
                {short(t.name)}
              </th>
            ))}
            <th className="margin" title={titleOf(presenceMode ? "presenceDb" : "rowScale")}>
              {presenceMode ? "presence dB" : "carves ×"}
            </th>
            <th className="margin">dominates</th>
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
                  <td key={t.id} style={shade(contrib(s, t))} title={`${short(s.name)} dominates ${short(t.name)} over ${(contrib(s, t) * 100).toFixed(0)}% of its audible range`}>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      step={0.1}
                      value={pairById[s.id]?.[t.id] ?? ""}
                      placeholder="1"
                      onChange={(e) => dispatch({ type: "SET_PAIR", source: s.id, target: t.id, value: e.target.value === "" ? null : parseFloat(e.target.value) })}
                    />
                  </td>
                )
              )}
              <td className="margin">
                {presenceMode ? (
                  <input
                    type="number"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={s.presenceDb ?? 0}
                    title={`fader ${(curves?.faders?.[idx.get(s.id)] ?? 0).toFixed(1)} + presence ${(s.presenceDb ?? 0).toFixed(1)} = ${((curves?.faders?.[idx.get(s.id)] ?? 0) + (s.presenceDb ?? 0)).toFixed(1)} dB in the contest`}
                    onChange={(e) => dispatch({ type: "SET_STEM", id: s.id, patch: { presenceDb: parseFloat(e.target.value) || 0 } })}
                  />
                ) : (
                  <input type="number" min={0} max={4} step={0.1} value={s.rowScale} title={titleOf("rowScale")} onChange={(e) => dispatch({ type: "SET_STEM", id: s.id, patch: { rowScale: parseFloat(e.target.value) || 0 } })} />
                )}
              </td>
              <td className="margin num">{(rowTotal(s) * 100).toFixed(0)}%</td>
            </tr>
          ))}
          <tr>
            <th className="margin" title={titleOf("colScale")}>
              accepts ×
            </th>
            {stems.map((t) => (
              <td key={t.id} className="margin">
                <input type="number" min={0} max={4} step={0.1} value={t.colScale} title={titleOf("colScale")} onChange={(e) => dispatch({ type: "SET_STEM", id: t.id, patch: { colScale: parseFloat(e.target.value) || 0 } })} />
              </td>
            ))}
            <td className="diag" />
            <td className="diag" />
          </tr>
          <tr>
            <th className="margin">is dominated</th>
            {stems.map((t) => (
              <td key={t.id} className="margin num">
                {(colTotal(t) * 100).toFixed(0)}%
              </td>
            ))}
            <td className="diag" />
            <td className="diag" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
