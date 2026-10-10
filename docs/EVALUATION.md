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

The session total is the energy-weighted mean. Before vs after applies each
stem's filter chain in the band-energy domain using the exact magnitude
response of its peaking filters and high-pass at every ERB band centre
(`erbChainGainsDb` in `src/dsp/mixLoudness.js`), plus make-up; the in-app
report measures the rendered audio instead.

**Subjective.** The *Listen* workspace: a blind comparison over a loop of
the raw stems, the balanced faders and the EQ at its current settings, plus
any external renders of the same stems, each matched to the same BS.1770
integrated loudness, shuffled and lettered. Two ratings per condition,
*separation* and *naturalness*; identities revealed on request; ratings
downloadable as JSON. The design follows the multi-stimulus, no-mandatory-
reference tests used for mixes (`deman2015perceptual`; see the reading
priorities in `docs/references/README.md` for a full test design).

**The paper's own measure.** The Masking workspace and the CLI also report
Hafezi & Reiss's kind of objective: the masking value (dB by which a masker
is louder in a band essential for the maskee and nonessential for itself)
summed over all occurrences, before and after the EQ.

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
one backing vocal. 44.1 kHz, 24-bit, 302 s each. Faders from the app's
Balance (BS.1770 loudness plus default role offsets): kick 0.0, snare −5.6,
OH −1.2, bass −7.4, guitars −9.9 / −11.2, organ −13.7, piano −1.7, vocal
−8.5, BGV −10.4 dB.

`lit` is the EQ at its defaults (masking reduction at Amount 0.5, cut on
the masker, high-pass by role at 80 Hz, no spectral balance). The other
rows change one thing each.

| preset | masked before | masked after | Δ masked | SMR before | SMR after | Δ SMR | effect | make-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bypass | 75.6% | 75.6% | 0.0 pt | -17.17 dB | -17.17 dB | +0.00 dB | 0.0 dB | 0.0 dB |
| lit | 75.6% | 74.9% | -0.7 pt | -17.17 dB | -17.05 dB | +0.12 dB | 0.5 dB | 0.0 dB |
| litNoHpf | 75.6% | 75.7% | 0.2 pt | -17.17 dB | -17.25 dB | -0.09 dB | 0.5 dB | 0.0 dB |
| litMaskee | 75.6% | 74.7% | -0.9 pt | -17.17 dB | -16.94 dB | +0.23 dB | 0.3 dB | 0.0 dB |
| litAmount1 | 75.6% | 75.0% | -0.5 pt | -17.17 dB | -17.14 dB | +0.03 dB | 1.1 dB | 0.0 dB |
| litBalance | 75.6% | 80.9% | 5.3 pt | -17.17 dB | -18.25 dB | -1.08 dB | 6.7 dB | 3.7 dB |
| litBalanceAmount1 | 75.6% | 82.7% | 7.1 pt | -17.17 dB | -18.66 dB | -1.49 dB | 10.2 dB | 5.9 dB |

The paper's own measure:

| preset | occurrences | before | after |
| --- | --- | --- | --- |
| lit | 8 | 11.4 dB·occ | 5.8 dB·occ |
| litMaskee | 8 | 11.4 dB·occ | 21.2 dB·occ |
| litAmount1 | 8 | 11.4 dB·occ | 0.2 dB·occ |
| litBalance | 8 | 11.4 dB·occ | 27.6 dB·occ |
| litBalanceAmount1 | 8 | 11.4 dB·occ | 29.4 dB·occ |

Per stem at the defaults:

| stem | masked before | masked after | SMR before | SMR after | effect |
| --- | --- | --- | --- | --- | --- |
| Kick | 89.7% | 89.9% | -26.36 dB | -26.57 dB | 2.3 dB |
| Snare top | 96.8% | 96.8% | -29.69 dB | -29.45 dB | 0.3 dB |
| OH L | 75.5% | 75.2% | -17.13 dB | -17.06 dB | 0.0 dB |
| Bass | 53.9% | 51.7% | -8.93 dB | -8.28 dB | 0.5 dB |
| Guitar | 87.8% | 87.7% | -16.05 dB | -16.14 dB | 0.0 dB |
| Guitar 2 | 83.4% | 83.2% | -14.44 dB | -14.33 dB | 0.0 dB |
| Organ L | 74.6% | 74.4% | -14.97 dB | -14.82 dB | 0.0 dB |
| Piano L | 91.4% | 91.1% | -22.46 dB | -22.25 dB | 0.0 dB |
| Vox | 70.7% | 71.5% | -15.41 dB | -15.94 dB | 1.6 dB |
| BGV 1 | 90.3% | 90.3% | -25.66 dB | -25.81 dB | 0.7 dB |

## Reading the numbers

- **Level dominates.** With ten stems at balanced loudness each sits about
  10 dB under the sum of the others, so the metric calls the mix three
  quarters masked before any EQ. Balance sets masking; EQ is second order.
  That is also what listening says: the large audible change comes from
  gain staging, and the EQ is a clean finish on top.
- **The masking stage does what the paper says, gently.** On balanced stems
  the 2015 test finds only eight occurrences; cutting the masker removes
  them (Amount 1) with about 1 dB of mean change, and the ERB masked
  fraction drops by under a point. The test is written for unbalanced
  material; most of its work was already done by the faders.
- **The high-pass helps.** Without it the defaults score slightly worse
  than bypass on this metric; with it, slightly better. The likely reason is
  that the high-pass removes low-frequency energy from non-bass stems that
  sits in the bass's and kick's range.
- **Cutting the maskee** (not the paper) scores well on the ERB metric but
  more than doubles the paper's own measure: it cuts a stem in bands that
  are essential to it.
- **Spectral balance** (2009) moves 7 to 10 dB and makes both measures
  worse on balanced stems: equal loudness per band across channels means
  cutting every stem's loudest bands. It stays off by default.
- **What is left is listening.** The objective changes are small and in the
  range where listeners have disagreed with masking metrics before
  (`ronan2018automatic`; `wakefield2015investigation`). The Listen workspace
  is built for that comparison, and the reading list has the design for a
  proper test with other listeners.

Results for the archived Magic model are on the branch
`archive/magic-eq-original`.
