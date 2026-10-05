import { NUM_BANDS } from "./bands.js";
import { valueOnSegment } from "./gate.js";

const MIN_DELTA_DB = 0.05;

function clip(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

// For each stem and band, the gain value at t = 0 and a sparse list of
// setTargetAtTime events derived from the other stems' gate transitions.
// When gating is off, initial == G and there are no events.
export function buildGainTimelines(curves, analyses, knobs) {
  const N = curves.G.length;
  const out = [];
  for (let i = 0; i < N; i++) {
    const initial = Float64Array.from(curves.G[i]);
    const bands = new Array(NUM_BANDS).fill(null).map(() => []);
    out.push({ initial, static: curves.G[i], bands });
    if (!knobs.gateEnabled) continue;

    for (let b = 0; b < NUM_BANDS; b++) {
      const sources = [];
      for (let j = 0; j < N; j++) {
        if (j !== i && curves.cross[i][j][b] !== 0) sources.push(j);
      }
      if (sources.length === 0) continue;

      const n = curves.nContrib[i][b];
      const norm = n > 0 ? Math.pow(n, knobs.stackNorm) : 1;
      const state = new Uint8Array(N);
      const valueFor = () => {
        let sum = 0;
        for (const j of sources) if (state[j]) sum += curves.cross[i][j][b];
        return clip(curves.self[i][b] + sum / norm, -knobs.maxCut, 0);
      };

      const trs = [];
      for (const j of sources) {
        for (const tr of analyses[j].gate.transitions) {
          trs.push({ t: tr.t, j, on: tr.on });
        }
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
        events.push({
          t,
          target,
          tau: anyOn ? knobs.attackTau : knobs.releaseTau,
        });
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
