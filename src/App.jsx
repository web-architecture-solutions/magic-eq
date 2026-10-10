import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { reducer, initState, newStem, effectiveMuted, stemFaderDb } from "./state/reducer.js";
import { balanceLoudness, anchorFaders, predictMixPeak, masterTrimFor } from "./dsp/balance.js";
import { DEFAULT_ROLE_OFFSETS } from "./dsp/roles.js";
import { predictConditions, conditionSpecs, monitorGainDb } from "./dsp/mixLoudness.js";
import { deriveLitCurves } from "./dsp/litModel.js";
import { loadSettings, saveSettings, isModified } from "./state/settings.js";
import { decodeStemFile, channelsFromBuffer } from "./audio/decode.js";
import { analyzeInWorker } from "./audio/analyzeInWorker.js";
import { exportAll } from "./audio/exportAll.js";
import { useEngine } from "./ui/useEngine.js";
import GainView from "./ui/GainView.jsx";
import OverlaySpectrum from "./ui/OverlaySpectrum.jsx";
import { stemColor } from "./ui/palette.js";
import LitPanel from "./ui/LitPanel.jsx";
import DropZone from "./ui/DropZone.jsx";
import StemCard from "./ui/StemCard.jsx";
import MatrixView from "./ui/MatrixView.jsx";
import Transport from "./ui/Transport.jsx";
import ExportModal from "./ui/ExportModal.jsx";
import ListeningTest from "./ui/ListeningTest.jsx";
import SettingsModal from "./ui/SettingsModal.jsx";

const WORKSPACES = [
  ["gain", "Gain", "Gain staging: loudness balance by role, headroom, meters"],
  ["eq", "EQ", "Masking-reduction EQ from the literature, per stem"],
  ["masking", "Masking", "Who masks whom, and the occurrences the EQ acts on"],
  ["listen", "Listen", "Blind, loudness-matched comparison over a loop"],
];

const BYTES_PER_SAMPLE = 4;

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initState(loadSettings()));
  const { stems, knobs, sessionRate, compare, exportState, masterTrimDb, lastBalance } = state;
  const [workspace, setWorkspace] = useState("gain");
  const [hoverId, setHoverId] = useState(null);
  const [hiddenInOverlay, setHiddenInOverlay] = useState(() => new Set());
  const [overlayOpen, setOverlayOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    saveSettings(knobs);
  }, [knobs]);
  const settingsModified = isModified(knobs);
  const [trimMix, setTrimMix] = useState(true);

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
    const channels = channelsFromBuffer(buffer);
    let last = 0;
    try {
      const analysis = await analyzeInWorker(channels, sampleRate, { gateDb: knobsRef.current.gateDb }, (p) => {
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
      if ((s.status !== "ready" && s.status !== "error") || !s.buffer) continue;
      dispatch({ type: "STEM_REANALYZING", id: s.id });
      analyze(s.id, s.buffer, s.sampleRate);
    }
  }, [stems, analyze]);

  const needsReanalysis = stems.some((s) => s.analysis && s.analysis.gate.thresholdDb !== knobs.gateDb);

  const analyses = useMemo(() => stems.map((s) => (s.status === "ready" ? s.analysis : null)), [stems]);
  const faderDb = useMemo(() => stems.map(stemFaderDb), [stems]);
  const roles = useMemo(() => stems.map((s) => s.role), [stems]);
  const curves = useMemo(() => deriveLitCurves(analyses, faderDb, knobs, roles), [analyses, faderDb, knobs, roles]);
  const muted = useMemo(() => effectiveMuted(stems), [stems]);
  const readyStems = useMemo(() => stems.filter((s) => s.status === "ready"), [stems]);

  // The mix with EQ, per ready stem.
  const eqSpecs = useMemo(
    () =>
      stems
        .map((s, i) => ({
          id: s.id,
          faderDb: curves.faders[i],
          makeupDb: curves.makeupDb[i],
          gains: curves.G[i],
          bypass: s.bypass,
          muted: muted[i],
          q: curves.bandQ || 0,
          hpfHz: curves.hpfHz[i],
        }))
        .filter((_, i) => stems[i].status === "ready"),
    [stems, curves, muted]
  );
  // What plays: raw stems, balanced faders, or the mix with EQ.
  const specs = useMemo(() => conditionSpecs(eqSpecs, compare.condition), [eqSpecs, compare.condition]);

  // Loudness matching: predicted mix loudness of every condition, and the
  // monitor gain that puts the playing one at the listening level.
  const prediction = useMemo(() => {
    if (!sessionRate || readyStems.length === 0) return null;
    const info = readyStems.map((s) => ({ lufs: s.analysis?.lufs, erbMeanDb: s.analysis?.erb?.meanDb }));
    return predictConditions(info, eqSpecs, sessionRate);
  }, [readyStems, eqSpecs, sessionRate]);
  const monitorDb = compare.match && prediction ? monitorGainDb(prediction.loudness[compare.condition], compare.listenLufs, masterTrimDb) : 0;
  // Predicted peak of what plays, at the monitor: a clip warning.
  const monitorPeak = useMemo(() => {
    if (!prediction) return null;
    const items = readyStems
      .map((s, i) => ({ s, spec: specs[i], delta: prediction.deltas[i] }))
      .filter(({ s, spec }) => s.analysis?.framePeaksDb && !spec.muted)
      .map(({ s, spec, delta }) => ({ framePeaksDb: s.analysis.framePeaksDb, faderDb: spec.faderDb + (spec.bypass ? 0 : delta) + masterTrimDb + monitorDb }));
    return items.length ? predictMixPeak(items) : null;
  }, [prediction, readyStems, specs, masterTrimDb, monitorDb]);

  const engine = useEngine({ readyStems, sessionRate, specs, masterTrimDb, monitorDb });
  const { resetLoudness } = engine;
  useEffect(() => {
    resetLoudness();
  }, [compare.condition, compare.match, resetLoudness]);
  const setCompare = useCallback((patch) => dispatch({ type: "SET_COMPARE", patch }), []);
  const allReady = stems.length > 0 && stems.every((s) => s.status === "ready");

  // Keys: 1 raw, 2 balanced, 3 with EQ, space play/stop.
  const toggleRef = useRef(engine.toggle);
  toggleRef.current = engine.toggle;
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing = t && (t.isContentEditable || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || (t.tagName === "INPUT" && !["range", "checkbox", "radio", "button"].includes(t.type)));
      if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
      const cond = { 1: "raw", 2: "balanced", 3: "eq" }[e.key];
      if (cond) {
        dispatch({ type: "SET_COMPARE", patch: { condition: cond } });
        e.preventDefault();
      } else if (e.key === " " && !(t && (t.tagName === "BUTTON" || (t.tagName === "INPUT" && t.type !== "range")))) {
        toggleRef.current?.();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onBalance = useCallback(() => {
    const ready = stems.filter((s) => s.status === "ready" && s.analysis && !s.analysis.empty);
    if (ready.length === 0) return;
    const offsets = knobs.roleOffsets ?? DEFAULT_ROLE_OFFSETS;
    const auto = balanceLoudness(
      ready.map((s) => ({ lufs: s.analysis.lufs, role: s.role })),
      { targetLufs: knobs.targetLufs, offsets }
    );
    const { faders, shiftDb } = anchorFaders(auto, ready.map((s) => s.trimDb ?? 0));
    dispatch({ type: "BALANCE", method: "loudness", shiftDb, faders: ready.map((s, i) => ({ id: s.id, autoFaderDb: Math.round(faders[i] * 10) / 10 })) });
  }, [stems, knobs.roleOffsets, knobs.targetLufs]);

  const headroom = useMemo(() => {
    const items = stems.filter((s) => s.status === "ready" && s.analysis?.framePeaksDb).map((s) => ({ framePeaksDb: s.analysis.framePeaksDb, faderDb: knobs.postFader ? 0 : stemFaderDb(s) }));
    if (items.length === 0) return null;
    const p = predictMixPeak(items);
    return { ...p, suggestedTrimDb: masterTrimFor(p.upperDb, knobs.peakTargetDb ?? -6) };
  }, [stems, knobs.postFader, knobs.peakTargetDb]);

  const onExport = useCallback(async () => {
    dispatch({ type: "EXPORT_STATE", patch: { status: "running", progress: null, files: [], error: null, evaluation: null } });
    try {
      const { files, evaluation } = await exportAll({
        stems,
        specs: stems.map((s, i) => ({ faderDb: curves.faders[i], makeupDb: curves.makeupDb[i], gains: curves.G[i], q: curves.bandQ || 0, hpfHz: curves.hpfHz[i] })),
        curves,
        knobs,
        sampleRate: sessionRate,
        trimMix,
        masterTrimDb,
        onProgress: (progress) => dispatch({ type: "EXPORT_STATE", patch: { progress } }),
      });
      dispatch({ type: "EXPORT_STATE", patch: { status: "done", files, evaluation } });
    } catch (err) {
      dispatch({ type: "EXPORT_STATE", patch: { status: "error", error: err?.message || String(err) } });
    }
  }, [stems, curves, knobs, sessionRate, trimMix, masterTrimDb]);

  const memoryMb = stems.reduce((acc, s) => acc + (s.length || 0) * (s.channels || 0) * BYTES_PER_SAMPLE, 0) / 1048576;

  useEffect(() => {
    window.__magicEq = { state, curves, specs, eqSpecs, prediction, monitorDb, dispatch, setWorkspace, headroom, engine };
  });

  const eqLabel = `amount ${knobs.litAmount.toFixed(2)}${knobs.litBalance ? ", spectral balance" : ""}${knobs.litHpf ? `, HPF ${knobs.litHpfHz} Hz` : ""}`;

  const overlay =
    readyStems.length > 0 ? (
      <div className={`overlay-wrap${overlayOpen ? "" : " closed"}`}>
        <button type="button" className="link overlay-toggle" onClick={() => setOverlayOpen((o) => !o)}>
          {overlayOpen ? "hide overlay" : "show overlay"}
        </button>
        {overlayOpen ? (
          <OverlaySpectrum
            stems={stems}
            faders={faderDb.map((f) => (knobs.postFader ? 0 : f))}
            hoverId={hoverId}
            onHover={setHoverId}
            hidden={hiddenInOverlay}
            onToggle={(id) =>
              setHiddenInOverlay((h) => {
                const n = new Set(h);
                if (n.has(id)) n.delete(id);
                else n.add(id);
                return n;
              })
            }
          />
        ) : null}
      </div>
    ) : null;

  return (
    <div className="app">
      <div className="header">
        <nav className="nav">
          <h1>Magic EQ</h1>
          <div className="tabs workspaces" role="tablist">
            {WORKSPACES.map(([key, label, title]) => (
              <button key={key} type="button" role="tab" title={title} aria-selected={workspace === key} className={`tab${workspace === key ? " on" : ""}`} onClick={() => setWorkspace(key)}>
                {label}
              </button>
            ))}
          </div>
          <span className="hint">
            {sessionRate ? `session ${sessionRate} Hz` : "no stems loaded"}
            {memoryMb > 0 ? ` · ${memoryMb >= 1024 ? `${(memoryMb / 1024).toFixed(1)} GB` : `${memoryMb.toFixed(0)} MB`} in memory` : ""}
            {memoryMb > 1024 ? " (large sessions may exhaust the tab)" : ""}
          </span>
          <span className="spacer" />
          <DropZone compact label="Import" onFiles={addFiles} />
          <button type="button" className="primary" disabled={stems.length === 0} onClick={() => setExportOpen(true)}>
            Export
          </button>
          <button type="button" className={`gear${settingsModified ? " modified" : ""}`} onClick={() => setSettingsOpen(true)} title={settingsModified ? "Settings (modified from defaults)" : "Settings"}>
            ⚙
          </button>
        </nav>
        <Transport engine={engine} canPlay={readyStems.length > 0} compare={compare} onCompare={setCompare} prediction={prediction} monitorDb={monitorDb} monitorPeak={monitorPeak} />
        {workspace === "eq" ? <LitPanel knobs={knobs} dispatch={dispatch} curves={curves} /> : null}
      </div>

      <main className={`view view-${workspace}`}>
        {stems.length === 0 ? <DropZone onFiles={addFiles} /> : null}
        {workspace === "gain" ? (
          <GainView stems={stems} knobs={knobs} dispatch={dispatch} meters={engine.meters} muted={muted} onBalance={onBalance} headroom={headroom} masterTrimDb={masterTrimDb} lastBalance={lastBalance} allReady={allReady} compare={compare} />
        ) : null}
        {workspace === "eq" ? overlay : null}
        {workspace === "eq" ? (
          <div className="stems">
            {stems.map((s, i) => (
              <StemCard
                key={s.id}
                stem={s}
                index={i}
                curves={curves}
                muted={muted[i]}
                knobs={knobs}
                dispatch={dispatch}
                position={engine.playing ? engine.position : null}
                needsReanalysis={!!s.analysis && s.analysis.gate.thresholdDb !== knobs.gateDb}
                onRemove={() => dispatch({ type: "REMOVE_STEM", id: s.id })}
                onHover={setHoverId}
                color={stemColor(i)}
              />
            ))}
          </div>
        ) : null}
        {workspace === "masking" ? <MatrixView stems={stems} curves={curves} knobs={knobs} /> : null}
        {workspace === "listen" ? <ListeningTest stems={stems} curves={curves} sessionRate={sessionRate} eqLabel={eqLabel} /> : null}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} knobs={knobs} dispatch={dispatch} onReanalyze={reanalyze} needsReanalysis={needsReanalysis} modified={settingsModified} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} exportState={exportState} canExport={allReady} onExport={onExport} trimMix={trimMix} onTrimMix={setTrimMix} stemCount={stems.length} />
    </div>
  );
}
