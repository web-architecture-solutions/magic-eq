# Evaluation

How to measure what the tool does, and what the numbers say so far.

## Method

Two layers, following the automatic-mixing literature (Hafezi & Reiss 2015;
Ronan et al. 2018), which judged systems by an objective masking measure
*and* a listening test, and found that the two can disagree.

**Objective.** `src/dsp/metrics.js` implements an excitation-pattern
signal-to-masker ratio (SMR) in one-ERB bands (41 bands, 20 Hz to 20 kHz), in
the spirit of Vega & Janer (2010). For each stem the masker is the power sum
of all the other stems at mix level, spread across neighbouring bands with a
Schroeder-style spreading function (about 10 dB per Bark upward, 25 dB per
Bark downward). A stem's "own cells" are the time-frequency cells, in frames
where it is active, within 30 dB of its frame peak. Two numbers per stem:

- *masked fraction*: share of own cells where the stem is more than 6 dB
  under its spread masker;
- *mean SMR*: mean signal-to-masker ratio over own cells, in dB.

The session total is the energy-weighted mean. Before vs after applies the
derived 16-band gains (plus make-up) in the band-energy domain; the in-app
report measures the rendered audio instead.

**Subjective.** The *Listen* tab: a blind, loudness-matched comparison over a
loop. Conditions are Bypass (hidden reference), the current settings, and any
external renders of the same stems (TheMasker, Soothe, anything), shuffled
and lettered. Two ratings per condition, *separation* and *naturalness*;
identities revealed on request; ratings downloadable as JSON.

**CLI.**

```
node scripts/evaluate.mjs <wav files or dirs> [--presets a,b] [--balance rms|none] [--rendered dir] [--md]
```

`--balance lufs` (default) is the app's Balance: equal BS.1770 loudness
plus role offsets guessed from file names, anchored so nothing is boosted.
`--balance rms` equalises RMS over active frames instead. `--rendered dir` scores `<name>.eq.wav`
files on the actual audio, which is how another tool's output on the same
stems gets a number.

## Results: ten stems from the Human Radio session

Kick, snare top, overhead L, bass, two guitars, organ L, piano L, lead vocal,
one backing vocal. 44.1 kHz, 24-bit, 302 s each.

### Raw tracking levels (`--balance none`)

| preset | masked before | masked after | Δ masked | SMR before | SMR after | Δ SMR | overlap | effect | make-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bypass | 69.5% | 69.5% | 0.0 pt | -13.62 dB | -13.62 dB | +0.00 dB | +0.00 dB | 0.0 dB | 0.0 dB |
| defaults | 69.5% | 69.4% | -0.1 pt | -13.62 dB | -13.65 dB | -0.03 dB | -0.65 dB | 3.5 dB | 1.1 dB |
| carve3 | 69.5% | 69.1% | -0.4 pt | -13.62 dB | -13.55 dB | +0.07 dB | -0.48 dB | 1.9 dB | 0.9 dB |
| carve6 | 69.5% | 68.6% | -0.9 pt | -13.62 dB | -13.52 dB | +0.10 dB | -1.02 dB | 3.8 dB | 1.7 dB |
| scoop3 | 69.5% | 70.0% | 0.5 pt | -13.62 dB | -13.75 dB | -0.13 dB | -0.24 dB | 3.0 dB | 0.3 dB |
| flatten3 | 69.5% | 69.8% | 0.3 pt | -13.62 dB | -13.70 dB | -0.08 dB | +0.43 dB | 3.0 dB | 2.3 dB |
| shape | 69.5% | 69.6% | 0.1 pt | -13.62 dB | -13.65 dB | -0.03 dB | -0.25 dB | 2.5 dB | 3.6 dB |
| psycho3 | 69.5% | 69.2% | -0.3 pt | -13.62 dB | -13.56 dB | +0.06 dB | -0.47 dB | 1.7 dB | 0.7 dB |
| psycho6 | 69.5% | 68.8% | -0.7 pt | -13.62 dB | -13.54 dB | +0.08 dB | -0.99 dB | 3.2 dB | 1.3 dB |
| sum3 | 69.5% | 69.3% | -0.3 pt | -13.62 dB | -13.55 dB | +0.07 dB | -0.29 dB | 1.3 dB | 0.8 dB |
| mean3 | 69.5% | 69.0% | -0.5 pt | -13.62 dB | -13.47 dB | +0.15 dB | -0.25 dB | 1.8 dB | 0.4 dB |

### Equal-RMS balance (`--balance rms`)

Faders: kick +10.8, snare +9.4, OH +16.1, bass +2.5, guitars +5.3 / +4.6,
organ +1.9, piano +13.5, vocal +2.3, BGV +4.3 dB.

| preset | masked before | masked after | Δ masked | SMR before | SMR after | Δ SMR | overlap | effect | make-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bypass | 81.3% | 81.3% | 0.0 pt | -18.44 dB | -18.44 dB | +0.00 dB | +0.00 dB | 0.0 dB | 0.0 dB |
| defaults | 81.3% | 80.7% | -0.6 pt | -18.44 dB | -18.88 dB | -0.43 dB | -0.93 dB | 4.1 dB | 1.1 dB |
| carve3 | 81.3% | 80.8% | -0.5 pt | -18.44 dB | -18.78 dB | -0.33 dB | -0.73 dB | 2.2 dB | 0.9 dB |
| carve6 | 81.3% | 80.3% | -0.9 pt | -18.44 dB | -19.16 dB | -0.72 dB | -1.51 dB | 4.3 dB | 1.6 dB |
| scoop3 | 81.3% | 81.2% | -0.1 pt | -18.44 dB | -18.57 dB | -0.12 dB | -0.30 dB | 3.0 dB | 0.3 dB |
| flatten3 | 81.3% | 81.7% | 0.4 pt | -18.44 dB | -18.30 dB | +0.15 dB | +0.63 dB | 3.0 dB | 2.3 dB |
| shape | 81.3% | 81.0% | -0.3 pt | -18.44 dB | -18.63 dB | -0.18 dB | -0.42 dB | 2.5 dB | 3.6 dB |
| psycho3 | 81.3% | 80.8% | -0.5 pt | -18.44 dB | -18.76 dB | -0.32 dB | -0.71 dB | 2.1 dB | 0.9 dB |
| psycho6 | 81.3% | 80.4% | -0.9 pt | -18.44 dB | -19.13 dB | -0.68 dB | -1.46 dB | 4.1 dB | 1.6 dB |
| sum3 | 81.3% | 81.1% | -0.2 pt | -18.44 dB | -18.67 dB | -0.23 dB | -0.33 dB | 1.1 dB | 0.6 dB |
| mean3 | 81.3% | 80.7% | -0.5 pt | -18.44 dB | -18.53 dB | -0.08 dB | -0.47 dB | 2.1 dB | 0.4 dB |

Per stem at defaults (balanced):

| stem | masked before | masked after | SMR before | SMR after | effect |
| --- | --- | --- | --- | --- | --- |
| Kick | 92.6% | 93.7% | -30.29 dB | -32.18 dB | 4.6 dB |
| Snare top | 97.4% | 98.2% | -29.57 dB | -32.27 dB | 4.8 dB |
| OH L | 69.2% | 64.6% | -13.89 dB | -12.34 dB | 5.0 dB |
| Bass | 68.8% | 68.0% | -13.95 dB | -13.82 dB | 4.6 dB |
| Guitar | 86.0% | 85.2% | -15.03 dB | -14.96 dB | 3.0 dB |
| Guitar 2 | 79.8% | 79.2% | -12.95 dB | -13.05 dB | 3.6 dB |
| Organ L | 73.0% | 72.8% | -13.92 dB | -14.08 dB | 4.2 dB |
| Piano L | 91.0% | 90.7% | -21.62 dB | -22.10 dB | 4.2 dB |
| Vox | 80.5% | 82.4% | -19.85 dB | -20.98 dB | 3.0 dB |
| BGV 1 | 91.4% | 92.8% | -26.11 dB | -27.39 dB | 4.0 dB |

### Literature flow (`--balance lufs`, the app's Balance)

Same ten stems, faders from the Gain workspace's loudness balance with the
default role offsets (kick 0.0, snare −5.6, OH −1.2, bass −7.4, guitars
−9.9 / −11.2, organ −13.7, piano −1.7, vocal −8.5, BGV −10.4 dB). `lit` is
the Literature flow at its defaults (Hafezi & Reiss 2015 masking stage,
Amount 0.5, masker cut, high-pass by role, no spectral balance);
`litBalance` adds the Perez-Gonzalez & Reiss 2009 spectral-balance stage.

| preset | masked before | masked after | Δ masked | SMR before | SMR after | Δ SMR | overlap | effect | make-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bypass | 75.6% | 75.6% | 0.0 pt | -17.17 dB | -17.17 dB | +0.00 dB | +0.00 dB | 0.0 dB | 0.0 dB |
| defaults (Magic) | 75.6% | 75.9% | 0.3 pt | -17.17 dB | -17.71 dB | -0.55 dB | -0.68 dB | 3.5 dB | 1.0 dB |
| lit | 75.6% | 75.7% | 0.1 pt | -17.17 dB | -17.22 dB | -0.06 dB | -0.01 dB | 0.5 dB | 0.0 dB |
| litMaskee | 75.6% | 75.5% | -0.0 pt | -17.17 dB | -17.16 dB | +0.01 dB | -0.01 dB | 0.3 dB | 0.0 dB |
| litAmount1 | 75.6% | 75.7% | 0.1 pt | -17.17 dB | -17.28 dB | -0.12 dB | -0.02 dB | 1.1 dB | 0.0 dB |
| litBalance | 75.6% | 77.9% | 2.4 pt | -17.17 dB | -17.46 dB | -0.29 dB | +1.66 dB | 7.0 dB | 3.8 dB |
| litBalanceAmount1 | 75.6% | 78.9% | 3.3 pt | -17.17 dB | -17.67 dB | -0.50 dB | +2.31 dB | 10.6 dB | 6.0 dB |

The paper's own kind of measure, the masking value summed over the
occurrences its test finds (masker louder in a band essential for the
maskee and nonessential for the masker):

| preset | occurrences | before | after |
| --- | --- | --- | --- |
| lit | 8 | 11.4 dB·occ | 5.8 dB·occ |
| litMaskee | 8 | 11.4 dB·occ | 21.2 dB·occ |
| litAmount1 | 8 | 11.4 dB·occ | 0.2 dB·occ |
| litBalance | 8 | 11.4 dB·occ | 28.6 dB·occ |
| litBalanceAmount1 | 8 | 11.4 dB·occ | 30.0 dB·occ |

Read: on balanced stems the 2015 test finds only eight occurrences across
ten stems, and cutting the masker by the full masking value (Amount 1)
removes them, as the method intends, with about 1 dB of mean effect. Cutting
the maskee instead (Magic's direction) raises the paper's measure, by
construction: the maskee is cut in a band essential to it. The 2009
spectral-balance stage raises it more, because equal loudness per band
across channels means cutting every stem's own loud bands, which are the
bands the masking test calls essential. The ERB masked fraction barely
moves under any of them (see below).

## Reading the numbers

- **Level dominates.** With ten stems at equal loudness each one sits about
  10 dB under the sum of the others, so the metric calls the mix 81% masked
  before any EQ. Static cuts of 3 to 6 dB move that by under a point. This is
  the finding in the literature too: balance sets masking; EQ is second
  order.
- **The direction is right, the size is small.** Every Unmask preset lowers
  the masked fraction; the self terms (Flatten, Scoop) do not, which is
  expected, because they are about a stem's own shape, not about who
  dominates whom. Mean SMR can go *down* while the masked fraction goes
  down: a stem that yields in a band it was losing anyway loses that band
  further (kick, snare, vocal), while the stems it yields to gain (overhead,
  bass, guitars). Whether that trade sounds like separation is exactly what
  the metric cannot say.
- **Combine modes.** Max (default) and psycho give the largest effect per dB;
  the power-sum of all others (the literature's framing) gives the smallest,
  because with many stems it flattens toward "everyone dominates everyone".
- **Psychoacoustic weighting** makes almost no difference to the metric at
  this band resolution, so it stays off by default.
- **What is left to measure** is the listening test. The size of the
  objective change here is in the range where Ronan et al. found listeners
  did not prefer the "less masked" mixes, and where Hafezi & Reiss found a
  single-parameter offline system approached a professional mix. Only ears
  decide between those two outcomes, and the Listen tab is built to make
  that comparison fair and blind, including against other tools' renders.
