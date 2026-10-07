import { NUM_BANDS } from "./bands.js";
import { valueOnSegment } from "./gate.js";
import { combineCross, finishGain, SILENT_DB } from "./model.js";

const MIN_DELTA_DB = 0.05;

// For each stem and band, the gain value at t = 0 and a sparse list of
// setTargetAtTime events derived from the other stems' gate transitions.
// The gated value goes through exactly the pipeline deriveCurves uses, with
// the static all-on contrast floor, so a cut can only shrink when a source
// drops out. When gating is off, initial == G and there are no events.
export function buildGainTimelines(curves, analyses, knobs, perTrack) {
  const N = curves.G.length;
  const ctx = { dom: curves.dom, weights: curves.weights, absDb: curves.absDb, live: curves.live, knobs, S: curves.S, H: curves.H };
  const mode = knobs.crossNorm || "max";
  const out = [];
  for (let i = 0; i < N; i++) {
    const initial = Float64Array.from(curves.G[i]);
    const bands = new Array(NUM_BANDS).fill(null).map(() => []);
    out.push({ initial, static: curves.G[i], bands });
    if (!knobs.gateEnabled || !curves.live[i]) continue;
    const colScale = perTrack?.[i]?.colScale ?? 1;

    for (let b = 0; b < NUM_BANDS; b++) {
      if (curves.S[i][b] < SILENT_DB || curves.maskProd[i][b] === 0) continue;
      const sources = [];
      for (let j = 0; j < N; j++) {
        if (j === i || !curves.live[j]) continue;
        const relevant = mode === "sum" ? curves.weights[i][j] > 0 && curves.S[j][b] >= SILENT_DB : curves.dom[i][j][b] > 0;
        if (relevant) sources.push(j);
      }
      if (sources.length === 0) continue;

      const state = new Uint8Array(N).fill(1);
      for (const j of sources) state[j] = 0;
      const valueFor = () => finishGain(curves.self[i][b], combineCross(ctx, i, b, state), curves.crossMin[i], curves.maskProd[i][b], colScale, knobs) + 0;

      const trs = [];
      for (const j of sources) {
        for (const tr of analyses[j].gate.transitions) trs.push({ t: tr.t, j, on: tr.on });
      }
      trs.sort((x, y) => x.t - y.t);

      // Transitions at t = 0 set the initial value instead of ramping.
      let k = 0;
      while (k < trs.length && trs[k].t <= 1e-6) {
        state[trs[k].j] = trs[k].on ? 1 : 0;
        k++;
      }
      initial[b] = valueFor();
      let last = initial[b];
      const events = bands[b];
      while (k < trs.length) {
        const t = trs[k].t;
        let anyOn = false;
        while (k < trs.length && trs[k].t - t < 1e-6) {
          state[trs[k].j] = trs[k].on ? 1 : 0;
          if (trs[k].on) anyOn = true;
          k++;
        }
        const target = valueFor();
        if (Math.abs(target - last) < MIN_DELTA_DB) continue;
        events.push({ t, target, tau: anyOn ? knobs.attackTau : knobs.releaseTau });
        last = target;
      }
    }
  }
  return out;
}

// Replays setTargetAtTime semantics in JS, for re-scheduling after a seek or
// knob change and for tests.
export function timelineValueAt(events, initial, t) {
  let from = initial;
  let target = initial;
  let tau = 0;
  let t0 = 0;
  for (const ev of events) {
    if (ev.t > t) break;
    from = valueOnSegment(from, target, tau, t0, ev.t);
    target = ev.target;
    tau = ev.tau;
    t0 = ev.t;
  }
  return valueOnSegment(from, target, tau, t0, t);
}

export function countEvents(timelines) {
  let n = 0;
  for (const tl of timelines) for (const ev of tl.bands) n += ev.length;
  return n;
}
