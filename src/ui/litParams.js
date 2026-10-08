// Provenance for every control of the literature flow.
//   documented: stated in the paper or a source citing it
//   inferred:   follows from the method, but no value is given
//   unverified: our choice, because the full text was not accessible
export const LIT_PARAMS = {
  litAmount: {
    name: "Amount",
    provenance: "documented",
    source: "Hafezi & Reiss 2015: the offline semi-autonomous system is controlled by one user parameter.",
    long: "Scales the masking-reduction gains and the spectral-balance correction. The listening test found this one knob took a raw mix past an amateur and close to a professional mix.",
  },
  litBalance: {
    name: "Spectral balance",
    provenance: "documented",
    source: "Perez-Gonzalez & Reiss 2009: cross-adaptive accumulative spectral decomposition toward equal perceptual loudness per band across channels.",
    long: "Each stem's band loudness is pushed toward the cross-channel average in that band, scaled by Amount. A separate system from the 2015 masking stage, off by default: combining them is our choice, and on balanced stems it raises the 2015 masking measure (it cuts every stem's own loud bands).",
  },
  litBalanceWeighting: {
    name: "Perceptual weighting",
    provenance: "inferred",
    source: "The 2009 paper weights band loudness perceptually; a secondary source names ISO 226. A-weighting approximates the 40-phon contour.",
    long: "Applied to band levels before averaging and before the masking test.",
  },
  litBalanceBoosts: {
    name: "Allow boosts",
    provenance: "unverified",
    source: "The 2009 paper applies graphic-EQ settings toward the average; whether boosts were allowed is not stated in accessible text.",
    long: "Off keeps the flow cut-only, which is also the best-practice rule in Pestana & Reiss.",
  },
  litMasking: {
    name: "Masking reduction",
    provenance: "documented",
    source: "Hafezi & Reiss 2015: masking in a region when the masker is louder and the region is nonessential for the masker and essential for the maskee.",
    long: "Finds the masking occurrences between every pair of stems and applies peaking cuts.",
  },
  litCutTarget: {
    name: "Cut",
    provenance: "documented",
    source: "Hafezi & Reiss 2015: the masker is attenuated at the frequencies where it dominates a maskee.",
    long: "Masker (the paper) cuts the louder stem where it does not need the band; maskee (Magic's direction) cuts the quieter stem where it loses.",
  },
  litEssentialDb: {
    name: "Essential range",
    provenance: "unverified",
    source: "The paper classifies bins as essential or nonessential per track; the threshold is not in accessible text.",
    long: "A band is essential for a stem when within this many dB of the stem's loudest band.",
  },
  litTopK: {
    name: "Filters per track",
    provenance: "documented",
    source: "Hafezi & Reiss 2015: at most three masking occurrences with the highest value per track are equalised, with three peaking filters in series.",
    long: "The strongest occurrences win; one filter per band.",
  },
  litQ: {
    name: "Filter Q",
    provenance: "documented",
    source: "Hafezi & Reiss 2015: fixed Q of 2.",
    long: "Applied to every peaking filter in the chain while this flow is active.",
  },
  litMaxCut: {
    name: "Max cut",
    provenance: "unverified",
    source: "Gain is taken from the masking value; no clamp is stated in accessible text.",
    long: "Clamp on any band's total cut.",
  },
  litHpf: {
    name: "High-pass by role",
    provenance: "documented",
    source: "De Man & Reiss 2013: rule families from mixing textbooks include high-pass filtering by instrument.",
    long: "A high-pass on every stem whose role is not kick, bass, drums or room.",
  },
  litHpfHz: {
    name: "High-pass frequency",
    provenance: "unverified",
    source: "Textbook values range 60 to 120 Hz; the paper's table was not accessible.",
    long: "Second-order Butterworth.",
  },
  litMakeup: {
    name: "Loudness-match make-up",
    provenance: "unverified",
    source: "Not part of the published methods; kept so A/B against bypass is fair.",
    long: "Restores each stem's band-weighted power after its cuts.",
  },
};

export const NOT_IMPLEMENTED = [
  "Ward, Reiss & Athwal 2012: faders by equal partial loudness (Glasberg & Moore model) — needs a partial-loudness model; the Gain workspace uses BS.1770 loudness instead (Mansbridge et al. 2012).",
  "Ronan et al. 2018: EQ and compression chosen by optimising an MPEG-style masking metric with particle swarm, with subgrouping — an optimiser, not a rule; the metric exists in Evaluate only as our ERB signal-to-masker ratio.",
  "Hafezi & Reiss 2015 real-time variant: frame-wise (1024-sample) masking with low latency — this flow implements the offline, whole-track version.",
  "Free filter centres at FFT peaks — this flow places filters on the 16 fixed band centres.",
];
