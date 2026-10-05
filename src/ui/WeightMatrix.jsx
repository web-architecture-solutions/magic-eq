// N x N pair overrides: rows are sources (carve), columns are targets (accept).
export default function WeightMatrix({ stems, pairById, dispatch }) {
  if (stems.length < 2) return null;
  const short = (n) => n.replace(/\.[^.]+$/, "").slice(0, 10);
  return (
    <section className="panel">
      <h2>Pair weights</h2>
      <p className="hint">Row carves column. Cell × row scalar × column scalar × W. Blank = 1.</p>
      <table className="matrix">
        <thead>
          <tr>
            <th className="corner">carves →</th>
            {stems.map((t) => (
              <th key={t.id} title={t.name}>
                {short(t.name)}
              </th>
            ))}
            <th className="margin">carves ×</th>
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
                  <td key={t.id}>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      step={0.1}
                      value={pairById[s.id]?.[t.id] ?? ""}
                      placeholder="1"
                      onChange={(e) =>
                        dispatch({
                          type: "SET_PAIR",
                          source: s.id,
                          target: t.id,
                          value: e.target.value === "" ? null : parseFloat(e.target.value),
                        })
                      }
                    />
                  </td>
                )
              )}
              <td className="margin">
                <input
                  type="number"
                  min={0}
                  max={4}
                  step={0.1}
                  value={s.rowScale}
                  onChange={(e) => dispatch({ type: "SET_STEM", id: s.id, patch: { rowScale: parseFloat(e.target.value) || 0 } })}
                />
              </td>
            </tr>
          ))}
          <tr>
            <th className="margin">accepts ×</th>
            {stems.map((t) => (
              <td key={t.id} className="margin">
                <input
                  type="number"
                  min={0}
                  max={4}
                  step={0.1}
                  value={t.colScale}
                  onChange={(e) => dispatch({ type: "SET_STEM", id: t.id, patch: { colScale: parseFloat(e.target.value) || 0 } })}
                />
              </td>
            ))}
            <td className="diag" />
          </tr>
        </tbody>
      </table>
    </section>
  );
}
