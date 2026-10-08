// One dictionary for every control: friendly name, formal symbol, and a
// description that says what it does and what it interacts with. Used for
// labels, title tooltips and the help list.
export const PARAMS = {
  carveDb: {
    name: "Unmask",
    symbol: "W",
    unit: "dB",
    short: "How deep stems are cut where others dominate them.",
    long:
      "Depth of the cross-track cuts, as contrast: each stem's least-contested audible band sits at 0 dB and its most-contested band gets up to this many dB. Scaled per pair by the matrix and per stem by Accepts cuts. Setting it to 0 leaves only Flatten and Scoop.",
  },
  levelDb: {
    name: "Flatten",
    symbol: "α",
    unit: "dB",
    short: "Damp each stem's own peaks.",
    long:
      "Self term. The stem's loudest band is cut by this many dB; bands further than Flatten reach (T) below the peak are untouched, with a linear ramp between. Opposes Scoop: equal amounts of both tend toward a flat cut, which make-up gain cancels.",
  },
  scoopDb: {
    name: "Scoop",
    symbol: "β",
    unit: "dB",
    short: "Cut the valleys between a stem's modes.",
    long:
      "Self term. Finds the stem's modes (fundamental and harmonics, the local maxima of its spectrum) and cuts between them, leaving the modes at 0 dB. A valley Scoop reach dB deep gets the full depth; shallower valleys proportionally less. This keeps the bite of a bass while clearing the space around it.",
  },
  focus: {
    name: "Selectivity",
    symbol: "H",
    unit: "",
    short: "Where a cross cut counts as deserved.",
    long:
      "Sets the headroom in the dominance test. At 0, a stem is cut wherever another stem is at least as loud there at mix level; at 1, only where the other stem out-levels it by the full Dominance range. Internally H = (1 − Selectivity) × D.",
  },
  maxCut: {
    name: "Ceiling",
    symbol: "M",
    unit: "dB",
    short: "Limit on any band's total cut. A preference, not a rule.",
    long:
      "The manual technique works in 1 to 2 dB steps and rarely stacks past a few dB per band; the default is that habit scaled up, nothing more. If pushing past it sounds better, raise it. Knee sets how it limits: hard (clamp) or soft (compression from a fraction of the ceiling). Cap marks on the plot show bands being held back.",
  },
  knee: {
    name: "Knee",
    symbol: "",
    unit: "",
    short: "How the ceiling limits: 0 is a hard clamp.",
    long:
      "At 0 the cut is clamped at the ceiling. Above 0 the cut is linear up to (1 − knee) of the ceiling and then compressed so it approaches the ceiling without reaching it; every knob still moves something past the knee, just less. The dotted line on the plot marks where compression starts.",
  },
  presenceDb: {
    name: "Presence",
    symbol: "p",
    unit: "dB",
    short: "How prominent this stem is treated in the contest.",
    long:
      "Analysis-only level offset: added to this stem's level in the dominance test, as masker and as maskee, so a raised stem carves more and accepts less. Playback and make-up never see it. This is the demaskers' input-level trick done per stem; the global version of it is Selectivity. Note that lowering a stem's presence lets everyone dominate it more uniformly, and the uniform part is removed as flat contest.",
  },
  driveMode: {
    name: "Stem drive",
    symbol: "",
    unit: "",
    short: "Presence in dB, or Carves others as a multiplier.",
    long: "Presence shifts a stem's level in the contest (both sides). Carves others multiplies its dominance as a source only. Accepts cuts applies in both modes.",
  },
  floorDb: {
    name: "Audible range",
    symbol: "floor",
    unit: "dB",
    short: "Which bands count as part of the stem.",
    long:
      "Bands within this many dB of the stem's own peak are its audible range. They define the contrast floor (the flat part of the cross cut that is removed) and the Effect readout. Quieter bands still receive cuts, which are harmless, and bands 60 dB down get nothing at all.",
  },
  T: {
    name: "Flatten reach",
    symbol: "T",
    unit: "dB",
    short: "How far below the peak Flatten reaches.",
    long: "Flatten cuts the peak band fully and ramps to nothing at this many dB below the peak.",
  },
  scoopRange: {
    name: "Scoop reach",
    symbol: "range",
    unit: "dB",
    short: "Valley depth that earns the full Scoop.",
    long: "A valley this far below the mode envelope gets the full Scoop depth; shallower valleys get proportionally less.",
  },
  D: {
    name: "Dominance range",
    symbol: "D",
    unit: "dB",
    short: "Level difference that gives a full cut.",
    long:
      "As another stem gets louder relative to this one in a band, the cut ramps from nothing to full over this many dB. Selectivity decides where on that ramp 'equal level' sits.",
  },
  crossNorm: {
    name: "Combine others",
    symbol: "",
    unit: "",
    short: "How the competing stems combine per band.",
    long:
      "max: the loudest competitor decides (adding a stem that competes nowhere changes nothing). sum: the power sum of all competitors, which treats many quiet stems like one loud one and tends toward flat with big sessions. mean: the average, softer with many stems.",
  },
  coupled: {
    name: "Couple stem knobs",
    symbol: "",
    unit: "",
    short: "Per-stem Flatten/Scoop multiply the global amounts.",
    long:
      "On: each stem's Flatten × and Scoop × multiply the global Flatten and Scoop, so the global knobs move everything together. Off: the per-stem values are absolute dB and the global knobs do not apply.",
  },
  rowScale: {
    name: "Carves others",
    symbol: "row",
    unit: "×",
    short: "How strongly this stem competes with the others.",
    long:
      "Row scalar in the matrix: multiplies this stem's dominance over every other stem before the per-band combine. 0 means this stem never causes a cut anywhere.",
  },
  colScale: {
    name: "Accepts cuts",
    symbol: "col",
    unit: "×",
    short: "How much of its computed cut this stem takes.",
    long:
      "Column scalar in the matrix: multiplies the Unmask depth applied to this stem. 0 for leads and vocals that should sit on top; above 1 to push a bed further back.",
  },
  level: {
    name: "Flatten ×",
    symbol: "α×",
    unit: "",
    short: "This stem's share of the global Flatten.",
    long: "Multiplier on the global Flatten when coupled; absolute dB when uncoupled.",
  },
  scoop: {
    name: "Scoop ×",
    symbol: "β×",
    unit: "",
    short: "This stem's share of the global Scoop.",
    long: "Multiplier on the global Scoop when coupled; absolute dB when uncoupled.",
  },
  mask: {
    name: "Band lock",
    symbol: "M_i(b)",
    unit: "",
    short: "Protect bands of this stem from cuts.",
    long: "Per-band multiplier on this stem's cuts: full, half, or locked. Applied after the contrast floor, so locking one band does not change the others. Use it where a layered sound is meant to overlap.",
  },
  mixMask: {
    name: "Mix band lock",
    symbol: "M(b)",
    unit: "",
    short: "Protect bands across the whole session.",
    long: "Per-band multiplier applied to every stem's cuts.",
  },
  pair: {
    name: "Pair weight",
    symbol: "w",
    unit: "×",
    short: "How strongly the row stem competes with the column stem.",
    long: "Multiplier on one ordered pair's dominance, on top of the row and column scalars. Blank means 1.",
  },
  fader: {
    name: "Fader",
    symbol: "L",
    unit: "dB",
    short: "Intended mix level.",
    long: "Only used to decide who dominates whom; it does not change playback level beyond what you hear here. Disabled when stems are post-fader.",
  },
  postFader: {
    name: "Stems are post-fader",
    symbol: "",
    unit: "",
    short: "Faders forced to 0 dB.",
    long: "Tick when the stems were exported with the mix balance baked in. The recorded levels then carry the balance.",
  },
  loudnessMatch: {
    name: "Loudness-match",
    symbol: "",
    unit: "",
    short: "Make-up gain after the cuts.",
    long: "Restores each stem's band-weighted power after its cuts so A/B comparisons are fair. Turn off to hear the raw loudness loss.",
  },
  gateEnabled: {
    name: "Follow activity",
    symbol: "a_j(t)",
    unit: "",
    short: "Cuts caused by a stem fade in only while it plays.",
    long:
      "Each stem's cuts on the others follow its activity gate with the attack and release below. Only audible on parts that start and stop; the activity strip under each stem shows where, and the lighter bars on the plot show the cut right now during playback.",
  },
  attackTau: { name: "Attack", symbol: "τa", unit: "s", short: "Fade-in time constant when a stem enters.", long: "One-pole time constant for cuts switching on." },
  releaseTau: { name: "Release", symbol: "τr", unit: "s", short: "Fade-out time constant when a stem stops.", long: "One-pole time constant for cuts switching off." },
  gateDb: {
    name: "Activity threshold",
    symbol: "",
    unit: "dBFS",
    short: "Frames below this count as silent.",
    long: "Also decides which frames go into each stem's spectrum. Changing it needs a re-analysis.",
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
