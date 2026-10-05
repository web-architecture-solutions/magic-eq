// Minimal WAV reader/writer. Reader covers 16/24/32-bit PCM and 32-bit
// float (plain and WAVE_FORMAT_EXTENSIBLE); writer emits 24-bit PCM.

function str(view, off, len) {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(off + i));
  return s;
}

export function parseWavHeader(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (str(view, 0, 4) !== "RIFF" || str(view, 8, 4) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file");
  }
  let off = 12;
  let fmt = null;
  let data = null;
  while (off + 8 <= view.byteLength) {
    const id = str(view, off, 4);
    const size = view.getUint32(off + 4, true);
    const body = off + 8;
    if (id === "fmt ") {
      let format = view.getUint16(body, true);
      const channels = view.getUint16(body + 2, true);
      const sampleRate = view.getUint32(body + 4, true);
      const bitsPerSample = view.getUint16(body + 14, true);
      if (format === 0xfffe && size >= 40) {
        format = view.getUint16(body + 24, true); // sub-format GUID's first word
      }
      fmt = { format, channels, sampleRate, bitsPerSample };
    } else if (id === "data") {
      data = { dataOffset: body, dataLength: Math.min(size, view.byteLength - body) };
      break;
    }
    off = body + size + (size & 1);
  }
  if (!fmt || !data) throw new Error("WAV missing fmt or data chunk");
  return { ...fmt, ...data };
}

export function decodeWavPcm(arrayBuffer) {
  const h = parseWavHeader(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const bytes = h.bitsPerSample / 8;
  const frames = Math.floor(h.dataLength / (bytes * h.channels));
  const channels = [];
  for (let c = 0; c < h.channels; c++) channels.push(new Float32Array(frames));
  let p = h.dataOffset;
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < h.channels; c++) {
      let v;
      if (h.format === 3 && h.bitsPerSample === 32) {
        v = view.getFloat32(p, true);
      } else if (h.bitsPerSample === 16) {
        v = view.getInt16(p, true) / 32768;
      } else if (h.bitsPerSample === 24) {
        const s =
          view.getUint8(p) | (view.getUint8(p + 1) << 8) | (view.getInt8(p + 2) << 16);
        v = s / 8388608;
      } else if (h.bitsPerSample === 32) {
        v = view.getInt32(p, true) / 2147483648;
      } else {
        throw new Error(`Unsupported WAV: format ${h.format}, ${h.bitsPerSample} bits`);
      }
      channels[c][f] = v;
      p += bytes;
    }
  }
  return { sampleRate: h.sampleRate, channels };
}

export function encodeWav24(channels, sampleRate) {
  const nch = channels.length;
  const frames = channels[0].length;
  const dataBytes = frames * nch * 3;
  const buf = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buf);
  const w = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  w(8, "WAVE");
  w(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, nch, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * nch * 3, true);
  view.setUint16(32, nch * 3, true);
  view.setUint16(34, 24, true);
  w(36, "data");
  view.setUint32(40, dataBytes, true);
  const out = new Uint8Array(buf, 44);
  let clippedSamples = 0;
  let p = 0;
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < nch; c++) {
      let v = channels[c][f];
      if (v > 1) {
        v = 1;
        clippedSamples++;
      } else if (v < -1) {
        v = -1;
        clippedSamples++;
      }
      const s = Math.round(v < 0 ? v * 8388608 : v * 8388607);
      out[p++] = s & 0xff;
      out[p++] = (s >> 8) & 0xff;
      out[p++] = (s >> 16) & 0xff;
    }
  }
  return { arrayBuffer: buf, clippedSamples };
}
