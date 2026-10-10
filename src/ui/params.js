// One dictionary for the gain-staging, analysis and mixer controls: friendly
// name, symbol, and a description that says what it does and what it
// interacts with. The EQ controls live in litParams.js with their sources.
export const PARAMS = {
  fader: {
    name: "Fader",
    symbol: "L",
    unit: "dB",
    short: "The stem's level in the mix.",
    long: "Automatic fader from Balance plus your trim. Moving it edits the trim. The EQ's masking test runs at these levels. Disabled when stems are post-fader.",
  },
  postFader: {
    name: "Stems are post-fader",
    symbol: "",
    unit: "",
    short: "Faders forced to 0 dB.",
    long: "Tick when the stems were exported with the mix balance baked in. The recorded levels then carry the balance.",
  },
  floorDb: {
    name: "Audible range",
    symbol: "",
    unit: "dB",
    short: "Which bands count as part of a stem for the readouts.",
    long: "Bands within this many dB of the stem's own peak make up its audible range, used by the effect readout and the masking matrix. It does not change the EQ.",
  },
  gateDb: {
    name: "Activity threshold",
    symbol: "",
    unit: "dBFS",
    short: "Frames below this count as silent.",
    long: "Spectra are accumulated only while a stem is playing, as in the cross-adaptive literature, so a part that enters late is not averaged with silence. Changing it needs a re-analysis.",
  },
  targetLufs: {
    name: "Loudness target",
    symbol: "LUFS",
    unit: "LUFS",
    short: "Where Balance puts each stem's integrated loudness.",
    long: "ITU-R BS.1770 integrated loudness (K-weighted, gated) over the stem on its own. The absolute value only sets how far below 0 dB the faders land; the balance between stems is what matters.",
  },
  roleOffsets: {
    name: "Role offsets",
    symbol: "",
    unit: "dB",
    short: "Level relative to equal loudness per instrument role.",
    long: "Heuristics directionally consistent with measurements of professional mixes (lead vocal on top; drums, bass, cymbals and room mics lower), editable and unverified. Two biases to know: K-weighting under-counts low frequencies (the bass offset partly compensates), and gating means a sparse crash and a continuous pad at equal loudness are not equally prominent.",
  },
  trimDb: {
    name: "Trim",
    symbol: "",
    unit: "dB",
    short: "Your manual offset on top of the automatic fader.",
    long: "Survives a re-balance. The EQ view's fader slider edits this.",
  },
  masterTrimDb: {
    name: "Master trim",
    symbol: "",
    unit: "dB",
    short: "Gain on the summed mix, for headroom.",
    long: "Applied to the exported mix. With loudness matching on, it does not change what you hear. The aim button puts the predicted mix peak at the peak target.",
  },
  peakTargetDb: {
    name: "Peak target",
    symbol: "",
    unit: "dBFS",
    short: "Where the aim button puts the predicted mix peak.",
    long: "-6 dBFS leaves room for later processing; 0 uses the full scale. Saved with the settings.",
  },
  makeup: {
    name: "Make-up",
    symbol: "",
    unit: "dB",
    short: "Gain after a stem's cuts that restores its loudness.",
    long: "Restores each stem's band-weighted power after its cuts, so bypassing a stem compares at equal loudness. Switch it off in the EQ panel to hear the raw loudness loss.",
  },
};

export function nameOf(key) {
  return PARAMS[key]?.name ?? key;
}

export function titleOf(key) {
  const p = PARAMS[key];
  if (!p) return "";
  return `${p.name}${p.symbol ? ` (${p.symbol})` : ""}: ${p.short} ${p.long}`;
}
