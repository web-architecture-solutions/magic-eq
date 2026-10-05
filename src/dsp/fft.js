// Iterative radix-2 complex FFT with precomputed tables, plus a Hann window
// and a calibrated power-spectrum helper. No dependencies.

export function makeFFT(n) {
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`FFT size must be a power of two, got ${n}`);
  }
  const levels = Math.log2(n);
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    let x = i;
    for (let l = 0; l < levels; l++) {
      r = (r << 1) | (x & 1);
      x >>= 1;
    }
    rev[i] = r;
  }
  const cosT = new Float64Array(n / 2);
  const sinT = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    const a = (-2 * Math.PI * i) / n;
    cosT[i] = Math.cos(a);
    sinT[i] = Math.sin(a);
  }

  function forward(re, im) {
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i];
        re[i] = re[j];
        re[j] = t;
        t = im[i];
        im[i] = im[j];
        im[j] = t;
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let start = 0; start < n; start += size) {
        for (let k = 0, tw = 0; k < half; k++, tw += step) {
          const c = cosT[tw];
          const s = sinT[tw];
          const a = start + k;
          const b = a + half;
          const tr = re[b] * c - im[b] * s;
          const ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
  }

  return { n, forward };
}

// Periodic Hann window.
export function hannWindow(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / n));
  }
  return w;
}

// Scratch and calibration for a given FFT + window pair.
export function makeSpectrumAnalyser(n) {
  const fft = makeFFT(n);
  const window = hannWindow(n);
  let sumW = 0;
  let sumW2 = 0;
  for (let i = 0; i < n; i++) {
    sumW += window[i];
    sumW2 += window[i] * window[i];
  }
  // Equivalent noise bandwidth in bins (1.5 for Hann). Dividing by it makes
  // the sum of bin powers across a sine's main lobe equal the sine's
  // amplitude squared, so a full-scale sine reads 0 dB in band-sum mode
  // wherever it falls between bins.
  const enbw = (n * sumW2) / (sumW * sumW);
  const scale = 4 / (sumW * sumW * enbw);
  const re = new Float64Array(n);
  const im = new Float64Array(n);

  // Writes n/2 + 1 power values (peak-amplitude calibrated) into out.
  function powerSpectrumInto(frame, offset, out) {
    for (let i = 0; i < n; i++) {
      const x = offset + i < frame.length ? frame[offset + i] : 0;
      re[i] = x * window[i];
      im[i] = 0;
    }
    fft.forward(re, im);
    const half = n / 2;
    out[0] = (re[0] * re[0] + im[0] * im[0]) * (scale / 4);
    for (let k = 1; k < half; k++) {
      out[k] = (re[k] * re[k] + im[k] * im[k]) * scale;
    }
    out[half] = (re[half] * re[half] + im[half] * im[half]) * (scale / 4);
  }

  return { n, fft, window, enbw, powerSpectrumInto };
}
