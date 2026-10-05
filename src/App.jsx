import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { reducer, initialState, newStem, pairArray, effectiveMuted } from "./state/reducer.js";
import { deriveCurves } from "./dsp/model.js";
import { buildGainTimelines } from "./dsp/timeline.js";
import { decodeStemFile, monoFromBuffer } from "./audio/decode.js";
import { analyzeInWorker } from "./audio/analyzeInWorker.js";
import { exportAll } from "./audio/exportAll.js";
import { useEngine } from "./ui/useEngine.js";
import DropZone from "./ui/DropZone.jsx";
import StemRow from "./ui/StemRow.jsx";
import KnobPanel from "./ui/KnobPanel.jsx";
import WeightMatrix from "./ui/WeightMatrix.jsx";
import Transport from "./ui/Transport.jsx";
import ExportPanel from "./ui/ExportPanel.jsx";

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { stems, knobs, pairById, sessionRate, mixBypass, exportState } = state;

  const sessionRateRef = useRef(sessionRate);
  useEffect(() => {
    sessionRateRef.current = sessionRate;
  }, [sessionRate]);
  const knobsRef = useRef(knobs);
  useEffect(() => {
    knobsRef.current = knobs;
  }, [knobs]);
  const decodeQueue = useRef(Promise.resolve());

  const analyze = useCallback(async (id, buffer, sampleRate) => {
    const mono = monoFromBuffer(buffer);
    let last = 0;
    try {
      const analysis = await analyzeInWorker(mono, sampleRate, { gateDb: knobsRef.current.gateDb }, (p) => {
        if (p - last >= 0.05) {
          last = p;
          dispatch({ type: "STEM_PROGRESS", id, progress: p });
        }
      });
      dispatch({ type: "STEM_ANALYZED", id, analysis });
    } catch (err) {
      dispatch({ type: "STEM_ERROR", id, error: err?.message || String(err) });
    }
  }, []);

  const addFiles = useCallback(
    (files) => {
      const placeholders = files.map((f) => newStem(f.name));
      dispatch({ type: "ADD_STEMS", stems: placeholders });
      files.forEach((file, i) => {
        const id = placeholders[i].id;
        // Decode sequentially so the first stem fixes the session rate and
        // later stems with a different native rate get resampled to it.
        decodeQueue.current = decodeQueue.current.then(async () => {
          try {
            const decoded = await decodeStemFile(file, sessionRateRef.current);
            if (!sessionRateRef.current) sessionRateRef.current = decoded.sampleRate;
            dispatch({ type: "STEM_DECODED", id, decoded });
            analyze(id, decoded.buffer, decoded.sampleRate);
          } catch (err) {
            dispatch({ type: "STEM_ERROR", id, error: err?.message || String(err) });
          }
        });
      });
    },
    [analyze]
  );

  const reanalyze = useCallback(() => {
    for (const s of stems) {
      if (s.status !== "ready" && s.status !== "error") continue;
      if (!s.buffer) continue;
      dispatch({ type: "STEM_REANALYZING", id: s.id });
      analyze(s.id, s.buffer, s.sampleRate);
    }
  }, [stems, analyze]);

  const needsReanalysis = stems.some((s) => s.analysis && s.analysis.gate.thresholdDb !== knobs.gateDb);

  const analyses = useMemo(() => stems.map((s) => (s.status === "ready" ? s.analysis : null)), [stems]);
  const perTrack = useMemo(
    () => stems.map((s) => ({ alpha: s.alpha, beta: s.beta, rowScale: s.rowScale, colScale: s.colScale, mask: s.mask, enabled: s.enabled })),
    [stems]
  );
  const faderDb = useMemo(() => stems.map((s) => s.faderDb), [stems]);
  const modelKnobs = useMemo(() => ({ ...knobs, pair: pairArray(stems, pairById) }), [knobs, stems, pairById]);
  const curves = useMemo(() => deriveCurves(analyses, faderDb, perTrack, modelKnobs), [analyses, faderDb, perTrack, modelKnobs]);
  const timelines = useMemo(() => buildGainTimelines(curves, analyses, modelKnobs), [curves, analyses, modelKnobs]);
  const muted = useMemo(() => effectiveMuted(stems), [stems]);
  const readyStems = useMemo(() => stems.filter((s) => s.status === "ready"), [stems]);
  const specs = useMemo(
    () =>
      stems
        .map((s, i) => ({
          id: s.id,
          faderDb: curves.faders[i],
          makeupDb: curves.makeupDb[i],
          gains: curves.G[i],
          timeline: timelines[i],
          bypass: s.bypass || mixBypass,
          muted: muted[i],
        }))
        .filter((_, i) => stems[i].status === "ready"),
    [stems, curves, timelines, mixBypass, muted]
  );

  const engine = useEngine({ readyStems, sessionRate, specs });
  const [trimMix, setTrimMix] = useState(true);
  const allReady = stems.length > 0 && stems.every((s) => s.status === "ready");

  const onExport = useCallback(async () => {
    dispatch({ type: "EXPORT_STATE", patch: { status: "running", progress: null, files: [], error: null } });
    try {
      const { files } = await exportAll({
        stems,
        specs: stems.map((s, i) => ({ faderDb: curves.faders[i], makeupDb: curves.makeupDb[i], gains: curves.G[i] })),
        timelines,
        curves,
        knobs: modelKnobs,
        sampleRate: sessionRate,
        trimMix,
        onProgress: (progress) => dispatch({ type: "EXPORT_STATE", patch: { progress } }),
      });
      dispatch({ type: "EXPORT_STATE", patch: { status: "done", files } });
    } catch (err) {
      dispatch({ type: "EXPORT_STATE", patch: { status: "error", error: err?.message || String(err) } });
    }
  }, [stems, curves, timelines, modelKnobs, sessionRate, trimMix]);

  // Debug handle for smoke tests and poking around in the console.
  useEffect(() => {
    window.__magicEq = { state, curves, timelines, specs, dispatch };
  });

  return (
    <main className="app">
      <header className="topbar">
        <h1>Magic EQ</h1>
        <span className="hint">{sessionRate ? `session ${sessionRate} Hz` : "no stems loaded"}</span>
        <span className="spacer" />
        <DropZone compact onFiles={addFiles} />
      </header>

      <Transport engine={engine} canPlay={readyStems.length > 0} mixBypass={mixBypass} onMixBypass={(v) => dispatch({ type: "SET_MIX_BYPASS", value: v })} masking={readyStems.length > 1 ? curves.masking : null} />

      <div className="columns">
        <div className="stems">
          {stems.length === 0 ? <DropZone onFiles={addFiles} /> : null}
          {stems.map((s, i) => (
            <StemRow
              key={s.id}
              stem={s}
              index={i}
              curves={curves}
              muted={muted[i]}
              knobs={knobs}
              dispatch={dispatch}
              needsReanalysis={!!s.analysis && s.analysis.gate.thresholdDb !== knobs.gateDb}
              onRemove={() => dispatch({ type: "REMOVE_STEM", id: s.id })}
            />
          ))}
        </div>
        <aside className="side">
          <KnobPanel knobs={knobs} dispatch={dispatch} onReanalyze={reanalyze} needsReanalysis={needsReanalysis} />
          <WeightMatrix stems={stems} pairById={pairById} dispatch={dispatch} />
          <ExportPanel exportState={exportState} canExport={allReady} onExport={onExport} trimMix={trimMix} onTrimMix={setTrimMix} />
        </aside>
      </div>
    </main>
  );
}
