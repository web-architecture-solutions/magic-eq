// Upper envelope through the local maxima (the "modes") of a band spectrum.
// E - S >= 0 everywhere; E == S at the maxima.
export function modeEnvelope(S) {
  const n = S.length;
  const E = new Float64Array(n);
  const peaks = [];
  for (let b = 0; b < n; b++) {
    const left = b === 0 ? -Infinity : S[b - 1];
    const right = b === n - 1 ? -Infinity : S[b + 1];
    if (S[b] >= left && S[b] >= right) peaks.push(b);
  }
  if (peaks.length === 0) {
    E.set(S);
    return E;
  }
  // Flat extrapolation outside the outer peaks, linear in between.
  for (let b = 0; b < n; b++) {
    if (b <= peaks[0]) {
      E[b] = S[peaks[0]];
    } else if (b >= peaks[peaks.length - 1]) {
      E[b] = S[peaks[peaks.length - 1]];
    } else {
      let k = 0;
      while (peaks[k + 1] < b) k++;
      const p0 = peaks[k];
      const p1 = peaks[k + 1];
      const f = (b - p0) / (p1 - p0);
      E[b] = S[p0] + f * (S[p1] - S[p0]);
    }
    if (E[b] < S[b]) E[b] = S[b];
  }
  return E;
}
