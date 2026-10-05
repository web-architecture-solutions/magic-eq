// 16 log-spaced bands covering 20 Hz .. 20480 Hz, 0.625 octave each.
// These match the layout of a 16-band parametric EQ.

export const NUM_BANDS = 16;
export const F_LO = 20;
export const OCTAVES_PER_BAND = 0.625;

// Linear (cookbook) Q for a peaking filter whose half-gain bandwidth spans
// one band: Q = 2^(N/2) / (2^N - 1).
export const BAND_Q =
  Math.pow(2, OCTAVES_PER_BAND / 2) / (Math.pow(2, OCTAVES_PER_BAND) - 1);

let edgesCache = null;
let centresCache = null;

export function bandEdges() {
  if (!edgesCache) {
    edgesCache = new Float64Array(NUM_BANDS + 1);
    for (let k = 0; k <= NUM_BANDS; k++) {
      edgesCache[k] = F_LO * Math.pow(2, k * OCTAVES_PER_BAND);
    }
  }
  return edgesCache;
}

export function bandCentres() {
  if (!centresCache) {
    const e = bandEdges();
    centresCache = new Float64Array(NUM_BANDS);
    for (let b = 0; b < NUM_BANDS; b++) {
      centresCache[b] = Math.sqrt(e[b] * e[b + 1]);
    }
  }
  return centresCache;
}

// Index of the band containing frequency f (Hz), or -1 if outside 20..20480.
export function bandIndexOf(f) {
  const e = bandEdges();
  if (f < e[0] || f >= e[NUM_BANDS]) return -1;
  return Math.min(
    NUM_BANDS - 1,
    Math.floor(Math.log2(f / F_LO) / OCTAVES_PER_BAND)
  );
}

// Inclusive FFT bin ranges per band for a given sample rate and FFT size.
// Bin k sits at k * sampleRate / nfft. A band [lo, hi) owns bins with
// lo <= f < hi. Bins above Nyquist are dropped; a band with hi < lo is empty.
export function binRanges(sampleRate, nfft) {
  const e = bandEdges();
  const nyqBin = nfft / 2;
  const out = [];
  for (let b = 0; b < NUM_BANDS; b++) {
    let lo = Math.ceil((e[b] * nfft) / sampleRate);
    let hi = Math.ceil((e[b + 1] * nfft) / sampleRate) - 1;
    if (hi > nyqBin) hi = nyqBin;
    if (lo > nyqBin) lo = nyqBin + 1;
    out.push({ lo, hi, empty: hi < lo });
  }
  return out;
}

export function ones(n = NUM_BANDS) {
  return new Array(n).fill(1);
}
