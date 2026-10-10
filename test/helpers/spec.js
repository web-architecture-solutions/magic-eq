import { NUM_BANDS } from "../../src/dsp/bands.js";

// A stem analysis with the given band levels (dB) and -80 dB elsewhere.
export function spec(levels) {
  const bandDb = new Float64Array(NUM_BANDS).fill(-80);
  for (const [b, v] of Object.entries(levels)) bandDb[+b] = v;
  const peakDb = Math.max(...bandDb);
  const S = bandDb.map((v) => v - peakDb);
  const bandPower = bandDb.map((v) => Math.pow(10, v / 10));
  return { bandDb, peakDb, S, bandPower, empty: false, gate: { transitions: [] } };
}
