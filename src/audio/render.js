import { buildStemChain } from "./graph.js";

// Render one stem through its chain, offline, at the buffer's own rate.
export async function renderStem(buffer, spec, timeline) {
  const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const chain = buildStemChain(offline, buffer, { ...spec, bypass: false, muted: false });
  chain.out.connect(offline.destination);
  chain.start(0, 0);
  if (timeline) chain.schedule(timeline, 0, 0);
  else chain.setGains(spec.gains, true);
  const rendered = await offline.startRendering();
  chain.dispose();
  return rendered;
}

// Render all stems summed to stereo at a common rate.
export async function renderMix(stems, specs, timelines, sampleRate) {
  let length = 0;
  for (const s of stems) length = Math.max(length, s.buffer.length);
  const offline = new OfflineAudioContext(2, length, sampleRate);
  const chains = stems.map((s, i) => {
    const chain = buildStemChain(offline, s.buffer, { ...specs[i], bypass: false, muted: false });
    chain.out.connect(offline.destination);
    chain.start(0, 0);
    if (timelines?.[i]) chain.schedule(timelines[i], 0, 0);
    else chain.setGains(specs[i].gains, true);
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
