import { bandCentres, BAND_Q, NUM_BANDS } from "../dsp/bands.js";
import { timelineValueAt } from "../dsp/timeline.js";
import { dbToGain } from "./context.js";

const SMOOTH = 0.02;

// One stem's processing chain, identical for the live AudioContext and an
// OfflineAudioContext:
//
//   source -> fader -> hpf -> [16 peaking biquads] -> makeup -> wet -> out
//                   \-> dry -------------------------------------/
//
// spec.q sets every peaking filter's Q (default BAND_Q); spec.hpfHz > 0
// engages a second-order high-pass (10 Hz when off, which is inaudible).
//
// `out` is left unconnected; the caller wires it to a bus or destination.
export function buildStemChain(ctx, buffer, spec) {
  const fader = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const makeup = ctx.createGain();
  const out = ctx.createGain();
  const nyq = ctx.sampleRate / 2;
  const centres = bandCentres();
  const hpf = ctx.createBiquadFilter();
  hpf.type = "highpass";
  hpf.Q.value = 0.7071;
  hpf.frequency.value = 10;
  fader.connect(hpf);
  const biquads = [];
  const usable = [];
  let prev = hpf;
  for (let b = 0; b < NUM_BANDS; b++) {
    const q = ctx.createBiquadFilter();
    q.type = "peaking";
    const ok = centres[b] < nyq * 0.95;
    usable.push(ok);
    q.frequency.value = ok ? centres[b] : nyq * 0.5;
    q.Q.value = BAND_Q;
    q.gain.value = 0;
    try {
      q.gain.automationRate = "k-rate";
    } catch {
      /* not supported */
    }
    prev.connect(q);
    prev = q;
    biquads.push(q);
  }
  prev.connect(makeup);
  makeup.connect(wet);
  wet.connect(out);
  fader.connect(dry);
  dry.connect(out);

  let source = null;
  let current = null;

  const isOffline = typeof OfflineAudioContext !== "undefined" && ctx instanceof OfflineAudioContext;

  function setParam(param, value, immediate) {
    if (immediate || isOffline) {
      param.cancelScheduledValues(0);
      param.setValueAtTime(value, ctx.currentTime);
    } else {
      param.cancelScheduledValues(ctx.currentTime);
      param.setTargetAtTime(value, ctx.currentTime, SMOOTH);
    }
  }

  function setStatic(next, immediate = false) {
    current = next;
    setParam(fader.gain, dbToGain(next.faderDb || 0), immediate);
    const q = next.q > 0 ? next.q : BAND_Q;
    for (const b of biquads) if (Math.abs(b.Q.value - q) > 1e-6) b.Q.value = q;
    setParam(hpf.frequency, next.hpfHz > 0 ? next.hpfHz : 10, immediate);
    setParam(makeup.gain, dbToGain(next.makeupDb || 0), immediate);
    setBypass(!!next.bypass, immediate);
    setParam(out.gain, next.muted ? 0 : 1, immediate);
  }

  function setBypass(bypass, immediate = false) {
    setParam(wet.gain, bypass ? 0 : 1, immediate);
    setParam(dry.gain, bypass ? 1 : 0, immediate);
  }

  // Static gains with no automation (stopped, or gating off).
  function setGains(gains, immediate = false) {
    for (let b = 0; b < NUM_BANDS; b++) {
      setParam(biquads[b].gain, usable[b] ? gains[b] : 0, immediate);
    }
  }

  // Schedule the sparse timeline. ctxTimeAtZero is the context time that
  // corresponds to song position 0; fromOffset is the song position at
  // which playback (re)starts.
  function schedule(timeline, ctxTimeAtZero, fromOffset) {
    const now = ctx.currentTime;
    for (let b = 0; b < NUM_BANDS; b++) {
      const p = biquads[b].gain;
      const events = timeline.bands[b];
      const initial = usable[b] ? timeline.initial[b] : 0;
      p.cancelScheduledValues(now);
      const v = usable[b] ? timelineValueAt(events, initial, fromOffset) : 0;
      if (isOffline) p.setValueAtTime(v, now);
      else p.setTargetAtTime(v, now, SMOOTH);
      if (!usable[b]) continue;
      for (const ev of events) {
        if (ev.t < fromOffset) continue;
        p.setTargetAtTime(ev.target, ctxTimeAtZero + ev.t, ev.tau);
      }
    }
  }

  function start(when, offset) {
    stop();
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(fader);
    source.start(when, Math.min(offset, buffer.duration));
    return source;
  }

  function stop() {
    if (source) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
      source = null;
    }
  }

  function dispose() {
    stop();
    for (const n of [fader, hpf, dry, wet, makeup, out, ...biquads]) n.disconnect();
  }

  if (spec) setStatic(spec, true);
  if (spec?.gains) setGains(spec.gains, true);

  return {
    buffer,
    fader,
    hpf,
    dry,
    wet,
    makeup,
    out,
    biquads,
    usable,
    get spec() {
      return current;
    },
    setStatic,
    setBypass,
    setGains,
    schedule,
    start,
    stop,
    dispose,
  };
}
