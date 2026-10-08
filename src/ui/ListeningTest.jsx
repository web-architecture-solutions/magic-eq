import { useCallback, useEffect, useRef, useState } from "react";
import { renderMix } from "../audio/render.js";
import { decodeStemFile } from "../audio/decode.js";
import { getLiveContext } from "../audio/context.js";
import { downloadBlob } from "../audio/exportAll.js";
import { integratedLoudness } from "../dsp/loudness.js";

// Hidden-identity, loudness-matched comparison of conditions over a loop.
// Built-in conditions: the raw stems, the balanced faders without EQ, and
// both EQ models (Magic and Literature) on those faders. External renders
// (mixes of the same stems from any other tool) can be added as further
// conditions, so the comparison is apples to apples. Every condition is
// matched to the same integrated loudness (BS.1770) over the loop.

const TARGET_LUFS = -20;
const SCALES = [
  ["separation", "Separation: how clearly the parts read as distinct"],
  ["naturalness", "Naturalness: free of processing artefacts, tonal shifts, pumping"],
];

function sliceBuffer(buffer, startSec, lenSec) {
  const sr = buffer.sampleRate;
  const start = Math.max(0, Math.floor(startSec * sr));
  const len = Math.max(1, Math.min(buffer.length - start, Math.floor(lenSec * sr)));
  const out = new AudioBuffer({ numberOfChannels: buffer.numberOfChannels, length: len, sampleRate: sr });
  const tmp = new Float32Array(len);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    buffer.copyFromChannel(tmp, c, start);
    out.copyToChannel(tmp, c);
  }
  return out;
}

function loudnessOf(buffer) {
  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const tmp = new Float32Array(buffer.length);
    buffer.copyFromChannel(tmp, c);
    channels.push(tmp);
  }
  return integratedLoudness(channels, buffer.sampleRate).lufs;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ListeningTest({ stems, buildFlow, sessionRate }) {
  const ready = stems.filter((s) => s.status === "ready");
  const duration = ready.reduce((m, s) => Math.max(m, s.durationSec), 0);
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(() => Math.min(30, Math.max(5, Math.floor(duration))));
  const [externals, setExternals] = useState([]); // { name, file }
  const [conditions, setConditions] = useState(null); // prepared: [{ id, name, buffer, gain }]
  const [order, setOrder] = useState([]); // shuffled condition ids -> letters
  const [ratings, setRatings] = useState({});
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState("");
  const nodes = useRef([]);
  const ctxRef = useRef(null);

  const stopAll = useCallback(() => {
    for (const n of nodes.current) {
      try {
        n.source.stop();
      } catch {
        /* already stopped */
      }
      n.source.disconnect();
      n.gain.disconnect();
    }
    nodes.current = [];
    setPlaying(false);
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const prepare = useCallback(async () => {
    stopAll();
    setRevealed(false);
    setRatings({});
    const idx = ready.map((s) => stems.indexOf(s));
    const win = { startSec: start, lengthSec: length };
    const flat = new Float64Array(16);
    const magic = buildFlow("magic");
    const lit = buildFlow("lit");
    const eqSpecs = ({ curves }) => idx.map((i) => ({ faderDb: curves.faders[i], makeupDb: curves.makeupDb[i], gains: curves.G[i], q: curves.bandQ || 0, hpfHz: curves.hpfHz ? curves.hpfHz[i] : 0 }));
    const plan = [
      ["raw", "Raw stems (every fader at 0 dB, no EQ)", idx.map(() => ({ faderDb: 0, makeupDb: 0, gains: flat })), null],
      ["balanced", "Balanced faders, no EQ", idx.map((i) => ({ faderDb: magic.curves.faders[i], makeupDb: 0, gains: flat })), null],
      ["magic", "Balanced + Magic EQ", eqSpecs(magic), idx.map((i) => magic.timelines[i])],
      ["lit", "Balanced + Literature EQ", eqSpecs(lit), idx.map((i) => lit.timelines[i])],
    ];
    const list = [];
    for (const [id, name, specs, tl] of plan) {
      setStatus(`Rendering ${name.toLowerCase()}…`);
      list.push({ id, name, buffer: await renderMix(ready, specs, tl, sessionRate, win) });
    }
    for (const ex of externals) {
      setStatus(`Decoding ${ex.name}…`);
      const d = await decodeStemFile(ex.file, sessionRate);
      list.push({ id: `ext:${ex.name}`, name: ex.name, buffer: sliceBuffer(d.buffer, start, length) });
    }
    for (const c of list) {
      c.lufs = loudnessOf(c.buffer);
      c.gain = Number.isFinite(c.lufs) ? Math.pow(10, (TARGET_LUFS - c.lufs) / 20) : 1;
    }
    setConditions(list);
    setOrder(shuffle(list.map((c) => c.id)));
    setCurrent(null);
    setStatus(`${list.length} conditions ready, loudness-matched to ${TARGET_LUFS} LUFS (BS.1770) over ${length.toFixed(0)} s from ${start.toFixed(0)} s.`);
  }, [ready, stems, buildFlow, sessionRate, externals, start, length, stopAll]);

  const play = useCallback(
    async (id) => {
      if (!conditions) return;
      const ctx = getLiveContext(sessionRate);
      ctxRef.current = ctx;
      if (ctx.state !== "running") await ctx.resume();
      if (nodes.current.length === 0) {
        const when = ctx.currentTime + 0.05;
        nodes.current = conditions.map((c) => {
          const source = ctx.createBufferSource();
          source.buffer = c.buffer;
          source.loop = true;
          const gain = ctx.createGain();
          gain.gain.value = 0;
          source.connect(gain);
          gain.connect(ctx.destination);
          source.start(when);
          return { id: c.id, source, gain, base: c.gain };
        });
        setPlaying(true);
      }
      const now = ctx.currentTime;
      for (const n of nodes.current) n.gain.gain.setTargetAtTime(n.id === id ? n.base : 0, now, 0.005);
      setCurrent(id);
    },
    [conditions, sessionRate]
  );

  const letters = order.map((id, i) => ({ id, letter: String.fromCharCode(65 + i) }));
  const setRating = (id, scale, value) => setRatings((r) => ({ ...r, [id]: { ...(r[id] || {}), [scale]: value } }));
  const download = () => {
    const payload = {
      createdAt: new Date().toISOString(),
      region: { start, length },
      conditions: conditions.map((c) => ({ id: c.id, name: c.name, lufs: c.lufs, matchGainDb: 20 * Math.log10(c.gain) })),
      mapping: letters,
      ratings,
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "listening-test.json");
  };
  const means = revealed && conditions ? conditions.map((c) => ({ ...c, mean: SCALES.map(([k]) => ratings[c.id]?.[k]).filter((v) => v != null) })) : null;

  return (
    <div className="listen">
      <p className="hint">
        Blind comparison over a loop of the raw stems, the balanced faders, and both EQ models, every one matched to the same integrated loudness. Conditions are shuffled and labelled by letter; identities are revealed only when you ask. Add mixes rendered by other tools from the same stems to compare them on equal terms.
      </p>
      <div className="listen-setup">
        <label className="slider">
          <span className="slider-label">loop start</span>
          <input type="range" min={0} max={Math.max(0, duration - 5)} step={1} value={start} onChange={(e) => setStart(parseFloat(e.target.value))} />
          <span className="slider-value">{start.toFixed(0)} s</span>
        </label>
        <label className="slider">
          <span className="slider-label">loop length</span>
          <input type="range" min={5} max={Math.max(5, Math.min(60, duration))} step={1} value={length} onChange={(e) => setLength(parseFloat(e.target.value))} />
          <span className="slider-value">{length.toFixed(0)} s</span>
        </label>
        <label className="dropzone compact" title="Add a WAV mix of the same stems rendered by another tool">
          <input
            type="file"
            multiple
            accept=".wav,audio/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const files = Array.from(e.target.files).map((f) => ({ name: f.name, file: f }));
              setExternals((x) => [...x, ...files]);
              e.target.value = "";
            }}
          />
          Add external render
        </label>
        {externals.map((ex, i) => (
          <span key={i} className="chip">
            {ex.name}
            <button type="button" className="link" onClick={() => setExternals((x) => x.filter((_, k) => k !== i))}>
              ×
            </button>
          </span>
        ))}
        <button type="button" className="primary" disabled={ready.length === 0} onClick={prepare}>
          Prepare conditions
        </button>
        <span className="hint">{status}</span>
      </div>

      {conditions ? (
        <div className="listen-trial">
          <div className="listen-buttons">
            {letters.map(({ id, letter }) => (
              <button key={id} type="button" className={`cond${current === id ? " on" : ""}`} onClick={() => play(id)}>
                {letter}
              </button>
            ))}
            <button type="button" onClick={stopAll} disabled={!playing}>
              Stop
            </button>
          </div>
          <table className="ratings">
            <thead>
              <tr>
                <th />
                {SCALES.map(([k, title]) => (
                  <th key={k} title={title}>
                    {k}
                  </th>
                ))}
                {revealed ? <th>identity</th> : null}
              </tr>
            </thead>
            <tbody>
              {letters.map(({ id, letter }) => (
                <tr key={id}>
                  <th>{letter}</th>
                  {SCALES.map(([k]) => (
                    <td key={k}>
                      <input type="range" min={0} max={100} step={1} value={ratings[id]?.[k] ?? 50} onChange={(e) => setRating(id, k, parseInt(e.target.value, 10))} />
                      <span className="slider-value">{ratings[id]?.[k] ?? "–"}</span>
                    </td>
                  ))}
                  {revealed ? <td>{conditions.find((c) => c.id === id)?.name}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="listen-actions">
            <button type="button" onClick={() => setRevealed(true)} disabled={revealed}>
              Reveal identities
            </button>
            <button type="button" onClick={download}>
              Download ratings
            </button>
            <button type="button" onClick={() => setOrder(shuffle(order))} disabled={revealed}>
              Reshuffle
            </button>
          </div>
          {means ? (
            <ul className="hint">
              {means.map((c) => (
                <li key={c.id}>
                  {c.name}: {SCALES.map(([k]) => `${k} ${ratings[c.id]?.[k] ?? "–"}`).join(", ")} · {Number.isFinite(c.lufs) ? `${c.lufs.toFixed(1)} LUFS before matching, ` : ""}match gain {(20 * Math.log10(c.gain)).toFixed(1)} dB
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
