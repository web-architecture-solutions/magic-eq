import { buildStemChain } from "./graph.js";

// Render one stem through its chain, offline, at the buffer's own rate.
export async function renderStem(buffer, spec) {
  const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const chain = buildStemChain(offline, buffer, { ...spec, bypass: false, muted: false });
  chain.out.connect(offline.destination);
  chain.start(0, 0);
  chain.setGains(spec.gains, true);
  const rendered = await offline.startRendering();
  chain.dispose();
  return rendered;
}

// Render all stems summed to stereo at a common rate. With a window, only
// [startSec, startSec + lengthSec) is rendered.
export async function renderMix(stems, specs, sampleRate, window = null) {
  let full = 0;
  for (const s of stems) full = Math.max(full, s.buffer.length);
  const startSec = window ? Math.max(0, window.startSec) : 0;
  const first = Math.min(full - 1, Math.floor(startSec * sampleRate));
  const length = window ? Math.max(1, Math.min(full - first, Math.floor(window.lengthSec * sampleRate))) : full;
  const offset = first / sampleRate;
  const offline = new OfflineAudioContext(2, length, sampleRate);
  const chains = stems.map((s, i) => {
    const chain = buildStemChain(offline, s.buffer, { ...specs[i], bypass: false, muted: false });
    chain.out.connect(offline.destination);
    chain.start(0, offset);
    chain.setGains(specs[i].gains, true);
    return chain;
  });
  const rendered = await offline.startRendering();
  chains.forEach((c) => c.dispose());
  return rendered;
}

export function rmsDbOfBuffer(buffer) {
  let acc = 0;
  let n = 0;
  const tmp = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    buffer.copyFromChannel(tmp, c);
    for (let i = 0; i < tmp.length; i++) acc += tmp[i] * tmp[i];
    n += tmp.length;
  }
  return n > 0 && acc > 0 ? 10 * Math.log10(acc / n) : -200;
}
