// ITU-R BS.1770-4 / EBU R128 loudness in pure JS: K-weighting as two
// biquads derived from the prewarped analog prototype (so any sample rate
// works and 48 kHz reproduces the Annex 1 table), 400 ms gating blocks with
// 75% overlap built from 100 ms sub-blocks, absolute gate -70 LUFS and
// relative gate -10 LU. Channels: left/right/centre weights of 1; a mono file
// is treated as dual-mono (+3.01 dB) because the engine plays it on both
// speakers.

export function kWeightingCoefficients(fs) {
  const f0 = 1681.974450955533;
  const G = 3.999843853973347;
  const Q = 0.7071752369554196;
  const K = Math.tan((Math.PI * f0) / fs);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0 = 1 + K / Q + K * K;
  const shelf = {
    b0: (Vh + (Vb * K) / Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
  const f1 = 38.13547087602444;
  const Q1 = 0.5003270373238773;
  const K1 = Math.tan((Math.PI * f1) / fs);
  const a01 = 1 + K1 / Q1 + K1 * K1;
  const hp = { b0: 1, b1: -2, b2: 1, a1: (2 * (K1 * K1 - 1)) / a01, a2: (1 - K1 / Q1 + K1 * K1) / a01 };
  return { shelf, hp };
}

// Transposed direct form II biquad over a Float32Array, returning Float64Array.
function biquad(x, c, out) {
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const y = c.b0 * v + z1;
    z1 = c.b1 * v - c.a1 * y + z2;
    z2 = c.b2 * v - c.a2 * y;
    out[i] = y;
  }
  return out;
}

export function kWeight(channel, fs) {
  const { shelf, hp } = kWeightingCoefficients(fs);
  const tmp = new Float64Array(channel.length);
  biquad(channel, shelf, tmp);
  return biquad(tmp, hp, tmp);
}

// Integrated loudness of a multichannel signal. Returns { lufs, blocks,
// ungated } with lufs = -Infinity when nothing passes the gates.
export function integratedLoudness(channels, fs, { monoAsDualMono = true } = {}) {
  const chans = channels.length === 1 && monoAsDualMono ? [channels[0], channels[0]] : channels;
  const sub = Math.round(fs * 0.1);
  const n = chans[0].length;
  const numSub = Math.floor(n / sub);
  if (numSub < 4) return { lufs: -Infinity, blocks: [], ungated: -Infinity };
  // Mean square per 100 ms sub-block, summed over channels.
  const z = new Float64Array(numSub);
  for (const ch of chans) {
    const w = kWeight(ch, fs);
    for (let s = 0; s < numSub; s++) {
      let acc = 0;
      const start = s * sub;
      for (let i = start; i < start + sub; i++) acc += w[i] * w[i];
      z[s] += acc / sub;
    }
  }
  const numBlocks = numSub - 3;
  const blockPower = new Float64Array(numBlocks);
  const blocks = new Float64Array(numBlocks);
  for (let j = 0; j < numBlocks; j++) {
    blockPower[j] = (z[j] + z[j + 1] + z[j + 2] + z[j + 3]) / 4;
    blocks[j] = blockPower[j] > 0 ? -0.691 + 10 * Math.log10(blockPower[j]) : -Infinity;
  }
  const ABS = -70;
  let sum = 0;
  let count = 0;
  for (let j = 0; j < numBlocks; j++) {
    if (blocks[j] > ABS) {
      sum += blockPower[j];
      count++;
    }
  }
  if (count === 0) return { lufs: -Infinity, blocks, ungated: -Infinity };
  const ungated = -0.691 + 10 * Math.log10(sum / count);
  const rel = ungated - 10;
  sum = 0;
  count = 0;
  for (let j = 0; j < numBlocks; j++) {
    if (blocks[j] > ABS && blocks[j] > rel) {
      sum += blockPower[j];
      count++;
    }
  }
  const lufs = count > 0 ? -0.691 + 10 * Math.log10(sum / count) : -Infinity;
  return { lufs, blocks, ungated };
}

export function samplePeakDb(channels) {
  let m = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) m = Math.max(m, Math.abs(ch[i]));
  return m > 0 ? 20 * Math.log10(m) : -Infinity;
}

// Per-analysis-frame peak (max over channels), in dB, aligned with the
// analysis frames so headroom can be estimated across stems.
export function framePeaksDb(channels, frameSize, hop) {
  const n = channels[0].length;
  const numFrames = n <= frameSize ? 1 : Math.floor((n - frameSize) / hop) + 1;
  const out = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const start = f * hop;
    let m = 0;
    for (const ch of channels) {
      for (let i = start; i < start + frameSize && i < n; i++) {
        const a = ch[i] < 0 ? -ch[i] : ch[i];
        if (a > m) m = a;
      }
    }
    out[f] = m > 0 ? 20 * Math.log10(m) : -120;
  }
  return out;
}
