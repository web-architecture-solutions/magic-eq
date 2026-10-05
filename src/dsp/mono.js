// Average any number of channels into a single Float32Array.
export function mixToMono(channels) {
  if (channels.length === 1) return Float32Array.from(channels[0]);
  const len = channels[0].length;
  const out = new Float32Array(len);
  const g = 1 / channels.length;
  for (const ch of channels) {
    for (let i = 0; i < len; i++) out[i] += ch[i] * g;
  }
  return out;
}
