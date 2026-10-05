// Writes three synthetic stems to fixtures/ for exercising the app before
// real stems exist. Levels are relative: bass and guitar at the same level,
// pad baked 20 dB quieter. The pad enters at 4 s; the guitar drops out
// between 8 s and 10 s so the gate has something to do.
import { mkdirSync, writeFileSync } from "node:fs";
import { threeStems, silence, concat, peak } from "../test/helpers/synth.js";
import { encodeWav24 } from "../src/dsp/wav.js";

const sr = 48000;
const seconds = 12;
const { bass, guitar, pad } = threeStems(sr, seconds, { padOffsetDb: -20 });

const guitarGapped = concat(guitar.subarray(0, 8 * sr), silence(sr, 2), guitar.subarray(10 * sr));
const padLate = concat(silence(sr, 4), pad.subarray(4 * sr));

const stems = { bass, guitar: guitarGapped, pad: padLate };
const scale = 0.9 / Math.max(...Object.values(stems).map(peak));
mkdirSync("fixtures", { recursive: true });
for (const [name, x] of Object.entries(stems)) {
  const scaled = Float32Array.from(x, (v) => v * scale);
  const channels = name === "bass" ? [scaled] : [scaled, scaled];
  const { arrayBuffer } = encodeWav24(channels, sr);
  writeFileSync(`fixtures/${name}.wav`, Buffer.from(arrayBuffer));
  console.log(`fixtures/${name}.wav  ${channels.length} ch, ${seconds} s @ ${sr} Hz`);
}
