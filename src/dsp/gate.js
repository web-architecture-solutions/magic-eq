// Frame-level activity detection and the gate envelope that drives the
// time-varying cross cuts.

export function numFramesFor(length, frameSize, hop) {
  if (length <= frameSize) return 1;
  return Math.floor((length - frameSize) / hop) + 1;
}

export function frameRmsDb(mono, frameSize, hop) {
  const n = numFramesFor(mono.length, frameSize, hop);
  const out = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    const start = f * hop;
    let acc = 0;
    let count = 0;
    for (let i = start; i < start + frameSize && i < mono.length; i++) {
      acc += mono[i] * mono[i];
      count++;
    }
    const ms = count > 0 ? acc / count : 0;
    out[f] = ms > 0 ? 10 * Math.log10(ms) : -200;
  }
  return out;
}

// Hysteresis gate with a hold time against chatter.
// Returns per-frame activity and a sparse list of transitions.
export function detectGate(
  rmsDb,
  { thresholdDb = -50, hysteresisDb = 6, holdSec = 0.25, frameRate }
) {
  const n = rmsDb.length;
  const active = new Uint8Array(n);
  const transitions = [];
  const holdFrames = Math.max(1, Math.round(holdSec * frameRate));
  const offLevel = thresholdDb - hysteresisDb;
  let on = false;
  let belowCount = 0;
  let activeCount = 0;
  for (let f = 0; f < n; f++) {
    const v = rmsDb[f];
    if (!on) {
      if (v > thresholdDb) {
        on = true;
        belowCount = 0;
        transitions.push({ t: f / frameRate, on: true });
      }
    } else if (v < offLevel) {
      belowCount++;
      if (belowCount >= holdFrames) {
        on = false;
        // The stem went quiet holdFrames ago; mark the transition there.
        const f0 = f - holdFrames + 1;
        for (let k = f0; k <= f; k++) {
          if (active[k]) {
            active[k] = 0;
            activeCount--;
          }
        }
        transitions.push({ t: f0 / frameRate, on: false });
      }
    } else {
      belowCount = 0;
    }
    if (on) {
      active[f] = 1;
      activeCount++;
    }
  }
  return {
    active,
    transitions,
    activeFraction: n > 0 ? activeCount / n : 0,
    thresholdDb,
  };
}

// One-pole response of the transition list, evaluated at time t.
// This is exactly what AudioParam.setTargetAtTime computes.
export function envelopeAt(transitions, attackTau, releaseTau, t) {
  let v = 0;
  let segStart = 0;
  let segFrom = 0;
  let target = 0;
  let tau = releaseTau;
  for (const tr of transitions) {
    if (tr.t > t) break;
    v = valueOnSegment(segFrom, target, tau, segStart, tr.t);
    segFrom = v;
    segStart = tr.t;
    target = tr.on ? 1 : 0;
    tau = tr.on ? attackTau : releaseTau;
  }
  return valueOnSegment(segFrom, target, tau, segStart, t);
}

export function envelopeSeries(transitions, attackTau, releaseTau, times) {
  const out = new Float32Array(times.length);
  let idx = 0;
  let segStart = 0;
  let segFrom = 0;
  let target = 0;
  let tau = releaseTau;
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    while (idx < transitions.length && transitions[idx].t <= t) {
      const tr = transitions[idx++];
      segFrom = valueOnSegment(segFrom, target, tau, segStart, tr.t);
      segStart = tr.t;
      target = tr.on ? 1 : 0;
      tau = tr.on ? attackTau : releaseTau;
    }
    out[i] = valueOnSegment(segFrom, target, tau, segStart, t);
  }
  return out;
}

export function valueOnSegment(from, target, tau, t0, t) {
  if (t <= t0) return from;
  if (tau <= 0) return target;
  return target + (from - target) * Math.exp(-(t - t0) / tau);
}
