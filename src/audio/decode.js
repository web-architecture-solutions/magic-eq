import { parseWavHeader, decodeWavPcm } from "../dsp/wav.js";

// Decode a stem file into an AudioBuffer at its native rate (or targetRate
// when given) using a throwaway OfflineAudioContext, which needs no user
// gesture. Falls back to the in-repo WAV reader when the browser refuses.
export async function decodeStemFile(file, targetRate = null) {
  const data = await file.arrayBuffer();
  let header = null;
  try {
    header = parseWavHeader(data);
  } catch {
    header = null;
  }
  const nativeRate = header?.sampleRate ?? null;
  const rate = targetRate || nativeRate || 48000;
  const nch = header?.channels || 2;
  const offline = new OfflineAudioContext(nch, 1, rate);
  let buffer;
  try {
    buffer = await offline.decodeAudioData(data.slice(0));
  } catch (err) {
    if (!header) throw err;
    const pcm = decodeWavPcm(data);
    if (pcm.sampleRate !== rate) throw err;
    buffer = offline.createBuffer(pcm.channels.length, pcm.channels[0].length, rate);
    pcm.channels.forEach((ch, c) => buffer.copyToChannel(ch, c));
  }
  return {
    name: file.name,
    buffer,
    sampleRate: buffer.sampleRate,
    nativeRate: nativeRate ?? buffer.sampleRate,
    channels: buffer.numberOfChannels,
    length: buffer.length,
    durationSec: buffer.duration,
  };
}

// Copy the buffer's channels into a fresh mono Float32Array that can be
// transferred to a worker without touching the AudioBuffer's own storage.
export function monoFromBuffer(buffer) {
  const n = buffer.length;
  const out = new Float32Array(n);
  const g = 1 / buffer.numberOfChannels;
  const tmp = new Float32Array(n);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    buffer.copyFromChannel(tmp, c);
    for (let i = 0; i < n; i++) out[i] += tmp[i] * g;
  }
  return out;
}

// Copies of every channel, transferable to a worker.
export function channelsFromBuffer(buffer) {
  const out = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = new Float32Array(buffer.length);
    buffer.copyFromChannel(ch, c);
    out.push(ch);
  }
  return out;
}
