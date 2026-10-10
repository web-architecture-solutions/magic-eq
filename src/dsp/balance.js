// Automatic gain staging (after Mansbridge, Finn & Reiss 2012): equal
// BS.1770 loudness plus per-role offsets. Returns raw auto faders (dB);
// apply anchorFaders so nothing is boosted above 0 dB.

// Equal K-weighted loudness toward a target, plus per-role offsets.
export function balanceLoudness(items, { targetLufs = -23, offsets = {} } = {}) {
  return items.map((it) => {
    if (!Number.isFinite(it.lufs)) return 0;
    return targetLufs + (offsets[it.role] ?? 0) - it.lufs;
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
