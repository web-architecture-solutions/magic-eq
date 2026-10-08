import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { reducer, initialState, initState, newStem, pairArray, effectiveMuted, stemFaderDb } from "./state/reducer.js";
import { balanceLoudness, balancePeakBand, balancePinkReference, anchorFaders, predictMixPeak, masterTrimFor } from "./dsp/balance.js";
import { DEFAULT_ROLE_OFFSETS } from "./dsp/roles.js";
import GainView from "./ui/GainView.jsx";
import OverlaySpectrum from "./ui/OverlaySpectrum.jsx";
import { stemColor } from "./ui/palette.js";
import { loadSettings, saveSettings, isModified } from "./state/settings.js";
import { deriveCurves } from "./dsp/model.js";
import { buildGainTimelines, timelineValueAt } from "./dsp/timeline.js";
import { NUM_BANDS } from "./dsp/bands.js";
import { decodeStemFile, channelsFromBuffer } from "./audio/decode.js";
import { analyzeInWorker } from "./audio/analyzeInWorker.js";
import { exportAll } from "./audio/exportAll.js";
import { useEngine } from "./ui/useEngine.js";
import DropZone from "./ui/DropZone.jsx";
import StemCard from "./ui/StemCard.jsx";
import MacroKnobs from "./ui/MacroKnobs.jsx";
import AdvancedPanel from "./ui/AdvancedPanel.jsx";
import MatrixView from "./ui/MatrixView.jsx";
import Transport from "./ui/Transport.jsx";
import ExportModal from "./ui/ExportModal.jsx";
import ListeningTest from "./ui/ListeningTest.jsx";
import SettingsModal from "./ui/SettingsModal.jsx";

const WORKSPACES = [
  ["gain", "Gain"],
  ["mix", "Mix"],
];
const TABS = [
  ["mix", "Simple"],
  ["advanced", "Advanced"],
  ["matrix", "Matrix"],
  ["listen", "Listen"],
];

const BYTES_PER_SAMPLE = 4;

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initState(loadSettings()));
  const { stems, knobs, pairById, sessionRate, mixBypass, exportState, masterTrimDb, lastBalance } = state;
  const [workspace, setWorkspace] = useState("gain");
  const [tab, setTab] = useState("mix");
  const [hoverId, setHoverId] = useState(null);
  const [hiddenInOverlay, setHiddenInOverlay] = useState(() => new Set());
  const [overlayOpen, setOverlayOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [highlightTerm, setHighlightTerm] = useState(null);
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
  const perTrack = useMemo(
    () => stems.map((s) => ({ level: s.level, scoop: s.scoop, rowScale: s.rowScale, colScale: s.colScale, mask: s.mask, enabled: s.enabled })),
    [stems]
  );
  const faderDb = useMemo(() => stems.map(stemFaderDb), [stems]);
  const modelKnobs = useMemo(() => ({ ...knobs, pair: pairArray(stems, pairById) }), [knobs, stems, pairById]);
  const curves = useMemo(() => deriveCurves(analyses, faderDb, perTrack, modelKnobs), [analyses, faderDb, perTrack, modelKnobs]);
  const timelines = useMemo(() => buildGainTimelines(curves, analyses, modelKnobs, perTrack), [curves, analyses, modelKnobs, perTrack]);
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

  const engine = useEngine({ readyStems, sessionRate, specs, masterTrimDb });
  const allReady = stems.length > 0 && stems.every((s) => s.status === "ready");

  const onBalance = useCallback(() => {
    const ready = stems.filter((s) => s.status === "ready" && s.analysis && !s.analysis.empty);
    if (ready.length === 0) return;
    const offsets = knobs.roleOffsets ?? DEFAULT_ROLE_OFFSETS;
    const items = ready.map((s) => ({ lufs: s.analysis.lufs, peakDb: s.analysis.peakDb, role: s.role, erb: { energies: s.analysis.erb.energies, numFrames: s.analysis.numFrames, active: s.analysis.active } }));
    const method = knobs.balanceMethod || "loudness";
    const auto =
      method === "pink" ? balancePinkReference(items, { targetDb: -18, offsets }) : method === "peakBand" ? balancePeakBand(items, { targetDb: -18, offsets }) : balanceLoudness(items, { targetLufs: knobs.targetLufs, offsets });
    const { faders, shiftDb } = anchorFaders(auto, ready.map((s) => s.trimDb ?? 0));
    dispatch({ type: "BALANCE", method, shiftDb, faders: ready.map((s, i) => ({ id: s.id, autoFaderDb: Math.round(faders[i] * 10) / 10 })) });
  }, [stems, knobs.roleOffsets, knobs.balanceMethod, knobs.targetLufs]);

  const headroom = useMemo(() => {
    const items = stems.filter((s) => s.status === "ready" && s.analysis?.framePeaksDb).map((s, i) => ({ framePeaksDb: s.analysis.framePeaksDb, faderDb: knobs.postFader ? 0 : stemFaderDb(s) }));
    if (items.length === 0) return null;
    const p = predictMixPeak(items);
    return { ...p, suggestedTrimDb: masterTrimFor(p.upperDb, -6) };
  }, [stems, knobs.postFader]);

  // Instantaneous gated cut per stem while playing, for the plot overlay.
  const liveG = useMemo(() => {
    if (!engine.playing || !knobs.gateEnabled) return null;
    return timelines.map((tl) => {
      const out = new Float64Array(NUM_BANDS);
      let any = false;
      for (let b = 0; b < NUM_BANDS; b++) {
        out[b] = tl.bands[b].length ? timelineValueAt(tl.bands[b], tl.initial[b], engine.position) : tl.static[b];
        if (tl.bands[b].length) any = true;
      }
      return any ? out : null;
    });
  }, [engine.playing, engine.position, knobs.gateEnabled, timelines]);

  const onExport = useCallback(async () => {
    dispatch({ type: "EXPORT_STATE", patch: { status: "running", progress: null, files: [], error: null, evaluation: null } });
    try {
      const { files, evaluation } = await exportAll({
        stems,
        specs: stems.map((s, i) => ({ faderDb: curves.faders[i], makeupDb: curves.makeupDb[i], gains: curves.G[i] })),
        timelines,
        curves,
        knobs: modelKnobs,
        sampleRate: sessionRate,
        trimMix,
        masterTrimDb,
        onProgress: (progress) => dispatch({ type: "EXPORT_STATE", patch: { progress } }),
      });
      dispatch({ type: "EXPORT_STATE", patch: { status: "done", files, evaluation } });
    } catch (err) {
      dispatch({ type: "EXPORT_STATE", patch: { status: "error", error: err?.message || String(err) } });
    }
  }, [stems, curves, timelines, modelKnobs, sessionRate, trimMix, masterTrimDb]);

  const memoryMb = stems.reduce((acc, s) => acc + (s.length || 0) * (s.channels || 0) * BYTES_PER_SAMPLE, 0) / 1048576;

  useEffect(() => {
    window.__magicEq = { state, curves, timelines, specs, dispatch, setTab, setWorkspace, headroom };
  });

  const cards = (advanced) =>
    stems.map((s, i) => (
      <StemCard
        key={s.id}
        stem={s}
        index={i}
        curves={curves}
        liveG={liveG?.[i] ?? null}
        muted={muted[i]}
        knobs={knobs}
        dispatch={dispatch}
        advanced={advanced}
        position={engine.playing ? engine.position : null}
        needsReanalysis={!!s.analysis && s.analysis.gate.thresholdDb !== knobs.gateDb}
        onRemove={() => dispatch({ type: "REMOVE_STEM", id: s.id })}
        onHover={setHoverId}
        color={stemColor(i)}
      />
    ));

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
    <div className={`app${highlightTerm ? ` hl-${highlightTerm}` : ""}`}>
      <div className="header">
        <nav className="nav">
          <h1>Magic EQ</h1>
          <div className="tabs workspaces" role="tablist">
            {WORKSPACES.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={workspace === key} className={`tab${workspace === key ? " on" : ""}`} onClick={() => setWorkspace(key)}>
                {label}
              </button>
            ))}
          </div>
          {workspace === "mix" ? (
            <div className="tabs" role="tablist">
              {TABS.map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tab${tab === key ? " on" : ""}`} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>
          ) : null}
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
        <Transport engine={engine} canPlay={readyStems.length > 0} mixBypass={mixBypass} onMixBypass={(v) => dispatch({ type: "SET_MIX_BYPASS", value: v })} masking={readyStems.length > 1 ? curves.masking : null} />
        {workspace === "mix" && tab === "mix" ? <MacroKnobs knobs={knobs} dispatch={dispatch} onHighlight={setHighlightTerm} /> : null}
      </div>

      <main className={`view view-${workspace === "gain" ? "gain" : tab}`}>
        {stems.length === 0 ? <DropZone onFiles={addFiles} /> : null}
        {workspace === "gain" ? (
          <GainView stems={stems} knobs={knobs} dispatch={dispatch} meters={engine.meters} muted={muted} onBalance={onBalance} headroom={headroom} masterTrimDb={masterTrimDb} lastBalance={lastBalance} allReady={allReady} />
        ) : null}
        {workspace === "mix" && (tab === "mix" || tab === "advanced") ? overlay : null}
        {workspace === "mix" && tab === "mix" ? <div className="stems">{cards(false)}</div> : null}
        {workspace === "mix" && tab === "advanced" ? (
          <div className="columns">
            <div className="stems">{cards(true)}</div>
            <aside className="side">
              <MacroKnobs knobs={knobs} dispatch={dispatch} onHighlight={setHighlightTerm} compact />
              <AdvancedPanel knobs={knobs} dispatch={dispatch} />
            </aside>
          </div>
        ) : null}
        {workspace === "mix" && tab === "matrix" ? <MatrixView stems={stems} curves={curves} pairById={pairById} dispatch={dispatch} knobs={knobs} /> : null}
        {workspace === "mix" && tab === "listen" ? (
          <ListeningTest stems={stems} specs={specs} timelines={timelines} curves={curves} sessionRate={sessionRate} knobsLabel={`depth ${knobs.carveDb} · peak taming ${knobs.levelDb} · valley cut ${knobs.scoopDb}`} />
        ) : null}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} knobs={knobs} dispatch={dispatch} onReanalyze={reanalyze} needsReanalysis={needsReanalysis} modified={settingsModified} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} exportState={exportState} canExport={allReady} onExport={onExport} trimMix={trimMix} onTrimMix={setTrimMix} stemCount={stems.length} />
    </div>
  );
}
