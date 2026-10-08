import { erbEdges, NUM_ERB } from "./metrics.js";

// Automatic gain staging. Every method returns raw auto faders (dB); apply
// anchorFaders so nothing is boosted above 0 dB.

// Equal K-weighted loudness toward a target, plus per-role offsets.
export function balanceLoudness(items, { targetLufs = -23, offsets = {} } = {}) {
  return items.map((it) => {
    if (!Number.isFinite(it.lufs)) return 0;
    return targetLufs + (offsets[it.role] ?? 0) - it.lufs;
  });
}

// "Peak band": the stem's loudest 16-band level to a common target. On
// 0.625-octave bands pink noise reads flat, so this is the band-domain
// version of the pink-noise method without its treble bias.
export function balancePeakBand(items, { targetDb = -18, offsets = {} } = {}) {
  return items.map((it) => (Number.isFinite(it.peakDb) ? targetDb + (offsets[it.role] ?? 0) - it.peakDb : 0));
}

// Pink noise power per ERB band, in dB, normalised to the band holding 1 kHz:
// proportional to the band's width in octaves.
export function pinkErbDb() {
  const e = erbEdges();
  const out = new Float64Array(NUM_ERB);
  let ref = 0;
  for (let b = 0; b < NUM_ERB; b++) {
    out[b] = 10 * Math.log10(Math.log2(e[b + 1] / e[b]));
    if (e[b] <= 1000 && e[b + 1] > 1000) ref = out[b];
  }
  for (let b = 0; b < NUM_ERB; b++) out[b] -= ref;
  return out;
}

// "Pink reference": the manual trick on ERB bands and per frame. For each
// active frame take the stem's loudest band relative to the pink slope; use
// the 95th percentile over frames (the loud moments you listen for) and
// bring it to the target.
export function balancePinkReference(items, { targetDb = -18, offsets = {}, percentile = 0.95 } = {}) {
  const pink = pinkErbDb();
  return items.map((it) => {
    const { energies, numFrames, active } = it.erb || {};
    if (!energies || !numFrames) return 0;
    const vals = [];
    for (let t = 0; t < numFrames; t++) {
      if (active && !active[t]) continue;
      let m = -Infinity;
      for (let b = 0; b < NUM_ERB; b++) {
        const e = energies[t * NUM_ERB + b];
        if (e <= 0) continue;
        const v = 10 * Math.log10(e) - pink[b];
        if (v > m) m = v;
      }
      if (Number.isFinite(m)) vals.push(m);
    }
    if (vals.length === 0) return 0;
    vals.sort((a, b) => a - b);
    const level = vals[Math.min(vals.length - 1, Math.floor(percentile * (vals.length - 1)))];
    return targetDb + (offsets[it.role] ?? 0) - level;
  });
}

// Shift all auto faders so the highest resulting fader (auto + trim) is 0 dB.
export function anchorFaders(auto, trims = []) {
  let top = -Infinity;
  for (let i = 0; i < auto.length; i++) top = Math.max(top, auto[i] + (trims[i] || 0));
  if (!Number.isFinite(top)) return { faders: auto.slice(), shiftDb: 0 };
  const shiftDb = -top;
  return { faders: auto.map((a) => a + shiftDb), shiftDb };
}

// Predicted mix peak from per-frame peaks: coherent sum (upper bound) and
// root-sum-square (uncorrelated estimate), both in dBFS.
export function predictMixPeak(items) {
  let T = 0;
  for (const it of items) if (it.framePeaksDb) T = Math.max(T, it.framePeaksDb.length);
  let upper = 0;
  let rss = 0;
  for (let t = 0; t < T; t++) {
    let lin = 0;
    let sq = 0;
    for (const it of items) {
      const p = it.framePeaksDb;
      if (!p || t >= p.length) continue;
      const a = Math.pow(10, (p[t] + (it.faderDb || 0)) / 20);
      lin += a;
      sq += a * a;
    }
    if (lin > upper) upper = lin;
    if (sq > rss) rss = sq;
  }
  return { upperDb: upper > 0 ? 20 * Math.log10(upper) : -Infinity, rssDb: rss > 0 ? 10 * Math.log10(rss) : -Infinity };
}

export function masterTrimFor(peakDb, targetPeakDb = -6) {
  return Number.isFinite(peakDb) ? Math.min(0, targetPeakDb - peakDb) : 0;
}
