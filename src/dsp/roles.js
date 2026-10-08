// Instrument roles and their level offsets relative to equal loudness.
// Heuristics, directionally consistent with where instruments sit in
// professional mixes (lead vocal on top, drums and bass below, cymbals and
// room mics lowest); editable in Settings.

export const ROLES = [
  ["leadVocal", "Lead vocal"],
  ["backingVocal", "Backing vocal"],
  ["kick", "Kick"],
  ["snare", "Snare"],
  ["drums", "Drums (toms etc.)"],
  ["cymbals", "Cymbals / hats / overheads"],
  ["room", "Room mics"],
  ["bass", "Bass"],
  ["lead", "Lead instrument"],
  ["rhythm", "Rhythm (guitar, keys, organ)"],
  ["pad", "Pad / strings"],
  ["other", "Other"],
];

export const DEFAULT_ROLE_OFFSETS = Object.freeze({
  leadVocal: 3,
  backingVocal: -2,
  kick: 0,
  snare: -1,
  drums: -2,
  cymbals: -4,
  room: -6,
  bass: 1,
  lead: 1,
  rhythm: -2,
  pad: -3,
  other: 0,
});

// Ordered keyword rules; earlier rules win ("kick" before "bass").
const RULES = [
  ["room", /\b(room|rm|amb(ience)?)\b/],
  ["kick", /\b(kick|bd|bass ?drum|kik)\b/],
  ["snare", /\b(snare|sn|sd|snr)\b/],
  ["cymbals", /\b(oh|overheads?|hat|hh|hihat|hi-hat|ride|crash|cym(bal)?s?|tamb(ourine)?|shaker)\b/],
  ["drums", /\b(tom|toms|drums?|perc(ussion)?|kit|floor)\b/],
  ["bass", /\b(bass|di|sub)\b/],
  ["backingVocal", /\b(bgv|bv|bvs|backing|harmony|harmonies|choir|gang)\b/],
  ["leadVocal", /\b(vox|vocal|vocals|voice|lead ?vox|ld ?vox|singer|vo)\b/],
  ["lead", /\b(lead|solo|melody|sax|trumpet|horn|flute|violin|fiddle)\b/],
  ["pad", /\b(pad|pads|strings|string|synth ?pad|ambient|texture)\b/],
  ["rhythm", /\b(gtr|guitar|guitars|keys|piano|organ|rhodes|wurli|synth|ep|clav|acoustic|elec(tric)?)\b/],
];

export function guessRole(name) {
  const n = (name || "").toLowerCase().replace(/\.[^.]+$/, "").replace(/[_\-.]+/g, " ");
  for (const [role, re] of RULES) if (re.test(n)) return role;
  return "other";
}

export function roleLabel(role) {
  return ROLES.find((r) => r[0] === role)?.[1] ?? role;
}
