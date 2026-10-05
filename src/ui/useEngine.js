import { useCallback, useEffect, useRef, useState } from "react";
import { getLiveContext } from "../audio/context.js";
import { LiveEngine } from "../audio/engine.js";

// Owns the live AudioContext and LiveEngine. Rebuilds the graph when the set
// of ready stems or the session rate changes; pushes specs on every change.
export function useEngine({ readyStems, sessionRate, specs }) {
  const engineRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const readyKey = readyStems.map((s) => s.id).join(",");

  useEffect(() => {
    if (!readyStems.length || !sessionRate) {
      engineRef.current?.dispose();
      engineRef.current = null;
      setPlaying(false);
      setPosition(0);
      setDuration(0);
      return;
    }
    const ctx = getLiveContext(sessionRate);
    if (!engineRef.current || engineRef.current.ctx !== ctx) {
      engineRef.current?.dispose();
      engineRef.current = new LiveEngine(ctx);
      setPlaying(false);
    }
    const engine = engineRef.current;
    engine.load(readyStems);
    engine.onEnded = () => {
      setPlaying(false);
      setPosition(0);
    };
    setDuration(engine.duration);
    engine.update(specs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyKey, sessionRate]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return undefined;
    const h = requestAnimationFrame(() => engine.update(specs));
    return () => cancelAnimationFrame(h);
  }, [specs]);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => setPosition(engineRef.current?.position() ?? 0), 100);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  const play = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.play();
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setPlaying(false);
    setPosition(engineRef.current?.position() ?? 0);
  }, []);

  const seek = useCallback((sec) => {
    engineRef.current?.seek(sec);
    setPosition(sec);
  }, []);

  const toggle = useCallback(() => (playing ? stop() : play()), [playing, play, stop]);

  return { playing, position, duration, play, stop, seek, toggle };
}
