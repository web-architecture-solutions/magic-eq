# Magic EQ: design note

Magic EQ builds the base layer of a mix from multitrack stems: a balanced,
transparent mix with the overlap between parts reduced, before any colour
is added. Every step is taken from the published automatic-mixing and
psychoacoustics literature, and every parameter says where it comes from.
`docs/references/` holds the reading list behind it.

## 1. Goal and assumptions

The base layer is the janitorial part of mixing: levels and frequency
overlap. Done by hand it takes years to learn and days per song, and
correcting it with characterful EQs stacks colour nobody chose. The tool
does it once, transparently, so colour and arrangement can go on top of a
clean foundation.

Assumptions:

- Stems are well recorded and tonally correct. No repair, no sound design,
  no colour.
- Cuts by default. Boosts exist only where a method documents them and only
  behind a toggle.
- Nothing is stored but the stems' analysis and the knobs. Every curve is
  recomputed from them, so rebalancing after the fact is a knob, not a pass
  over every EQ in the session.

## 2. History: the archived Magic model

The first versions used this project's own cross-track EQ model: cut each
stem where others dominate it, plus self-shaping terms, with contrast
normalisation, a soft ceiling and activity-following automation. A parallel
implementation of the literature was built next to it for comparison. On
real stems the literature version gave the cleaner result; the home-grown
model always sounded slightly filtered or phased by comparison and added no
character worth keeping as a later pass. The working line now contains only
the literature-grounded pipeline. The earlier model, its design notes and
its evaluation are preserved on the branch `archive/magic-eq-original`.

Parts of that work that are themselves established practice stayed:
loudness-matched comparison, the activity gate for spectrum accumulation,
the BS.1770 loudness meter and fader automation, the ERB masking metric,
the masking overlay, and the blind listening page. Each is grounded below.

## 3. Pipeline

1. **Analyse** each stem in a Web Worker: Welch-averaged spectrum in 16 log
   bands (20 Hz to 20 kHz, 0.625 octave each) over the frames where the
   stem is active; a long-term ERB spectrum (41 bands); per-channel
   ITU-R BS.1770 integrated loudness and sample peak; per-frame peaks.
2. **Gain-stage**: faders to equal loudness plus role offsets (§4).
3. **EQ**: masking reduction, optional spectral balance, high-pass by role
   (§5).
4. **Listen** at matched loudness: raw, balanced, with EQ (§6).
5. **Export** processed 24-bit stems, the mix, and a recipe of per-band
   gains, Q and high-pass that can be typed into any parametric EQ.

The activity gate (−50 dBFS default, hysteresis and hold) decides which
frames enter the long-term spectrum, so a part that enters late is not
averaged with silence. Perez Gonzalez & Reiss accumulate their
cross-adaptive features the same way, only while a channel is active
(`perezgonzalez2009automaticequalization`, `perezgonzalez2010advanced`).

## 4. Gain staging

Level dominates everything downstream: the masking test, the metric and
the ear all decide by who is louder first. Mansbridge, Finn & Reiss set
faders by EBU R128 / BS.1770 loudness toward a common target
(`mansbridge2012implementation`); studies of professional mixes measure
where instruments sit relative to the mix, with a large per-song spread
(`deman2014analysis`, `pestana2014intelligent`).

Implementation (`src/dsp/loudness.js`, `src/dsp/balance.js`):

- K-weighting from the prewarped analog prototype, so any sample rate
  matches the BS.1770 Annex 1 table; 400 ms blocks with 75% overlap,
  absolute gate −70 LUFS, relative gate −10 LU; per-channel power with mono
  treated as dual-mono because it plays on both speakers. Verified against
  the EBU Tech 3341 cases.
- `Balance = target + roleOffset − LUFS`, then shifted so the loudest fader
  is 0 dB. The EQ is invariant to a global fader offset, so the anchor is a
  convention.
- Role offsets are guessed from file names and editable. They are tagged
  heuristic: directionally consistent with the measurements, but not taken
  from a table. Two known biases: K-weighting under-counts low frequencies,
  and gating makes a sparse crash and a continuous pad at equal loudness
  unequal in prominence.
- Headroom is predicted from per-frame peaks (coherent bound and
  root-sum-square); the master trim aims the bound at a peak target
  (−6 dBFS by default, editable).

## 5. The EQ

`src/dsp/litModel.js` implements the published cross-adaptive methods as
literally as the accessible sources allow. Rule used to build it: where a
paper states a value or direction, use it; where the method implies a
choice but gives no value, infer one and tag it; where the full text was
not accessible, tag the choice unverified; and wherever this tool departs
from the paper, make the departure a control. Tags and sources are in
`src/ui/litParams.js` and on every row of the EQ panel.

**A. Masking reduction** (`hafezi2015autonomous`, offline system). Masker
*i* masks maskee *j* in band *b* when *i* is louder there, the band is
essential for *j* and nonessential for *i*. The masker is attenuated where
it dominates; at most three occurrences per track are equalised, one
peaking filter each, fixed Q of 2; the gain is the masking value scaled by
the one user parameter. Here: band levels at mix level with A-weighting;
essential = within *Essential range* of the stem's own loudest band;
masking value `m = L_i − L_j`; the strongest K occurrences per cut target,
one per band, `G = −Amount × m`, clamped at *Max cut*.

**B. Spectral balance** (`perezgonzalez2009automaticequalization`), off by
default. Perceptually weighted band loudness pushed toward the
cross-channel average in each band, scaled by Amount. It is a separate
system with a different objective: on balanced stems it cuts every stem's
own loud bands, which are the bands the 2015 test calls essential, and so
raises the 2015 masking measure (§7). Combining the two is this tool's
choice, so it is a toggle.

**C. High-pass by role** (`deman2013knowledge`, `deman2013semantic`).
A second-order Butterworth high-pass on every stem whose role is not kick,
bass, drums or room.

**Total.** `G = clip(balance + masking, −maxCut, maxBoost)`; make-up gain
restores each stem's band-weighted power so bypass comparisons are fair
(ours, switchable). The method is offline and static: no automation.

### Provenance of every control

| Control | Tag | Source |
|---|---|---|
| Amount | documented | one user parameter (`hafezi2015autonomous`) |
| Masking reduction | documented | the method itself |
| Cut masker / maskee | documented (masker) | the paper cuts the masker; maskee is kept as a comparison toggle |
| Essential range | unverified | threshold not in accessible text |
| Filters per track | documented | at most three occurrences per track |
| Filter Q | documented | fixed Q of 2 |
| Max cut | unverified | gain taken from the masking value; no clamp stated |
| Spectral balance | documented | `perezgonzalez2009automaticequalization` |
| Perceptual weighting | inferred | the paper weights perceptually; A-weighting stands in for ISO 226 (`iso2023normal`) |
| Allow boosts | unverified | not stated in accessible text |
| High-pass by role | documented | `deman2013knowledge` rule family |
| High-pass frequency | unverified | textbook range 60 to 120 Hz |
| Loudness-match make-up | ours | for fair comparison |

### Not implemented

- Partial-loudness faders (`ward2012multitrack`): needs the Moore-Glasberg
  partial-loudness model (`moore1997model`, `glasberg2005development`).
- Masking minimisation with subgroups by optimisation
  (`ronan2018automatic`): an optimiser over an MPEG-style masking model
  (`iso1993mpeg1audio`).
- Hafezi & Reiss's real-time, frame-wise variant.
- Filters at free centre frequencies or curve fits (`ma2013implementation`):
  filters sit on 16 fixed centres so the recipe stays typeable.

`docs/references/README.md` maps each unverified or missing item to the
sources that settle it.

## 6. Listening fairly

Louder sounds better, so every comparison is loudness-matched; listening
tests require level alignment for the same reason (`itu2015method`,
`wilson2016perception`).

- **Transport A/B.** Raw (every stem at 0 dB, no EQ), Balanced (faders, no
  EQ) and EQ play through a monitor gain after the master trim that brings
  each to one listening level (−20 LUFS by default). The loudness of each
  condition is predicted from the analysis (`src/dsp/mixLoudness.js`): each
  stem's BS.1770 loudness, fader and make-up, plus the change in its
  K-weighted power from the exact magnitude response of its filters (the
  RBJ forms Web Audio implements, checked against `getFrequencyResponse` to
  0.001 dB) over its long-term ERB spectrum, summed as uncorrelated powers.
  Within 0.03 LU of a rendered mix on uncorrelated test stems; on fourteen
  real stems with several mics per source, raw-to-balanced is off by
  0.3 LU and EQ-to-balanced by 0.03 LU or less. A K-weighted short-term
  meter on the monitor output shows what is heard. The monitor gain never
  reaches the export.
- **Blind listening page.** Raw, balanced and EQ conditions (plus external
  renders of the same stems) rendered over a loop, matched by measured
  BS.1770 loudness, shuffled and labelled by letter, MUSHRA-style without a
  mandatory reference (`itu2015method`, `deman2015perceptual`).

## 7. Evaluation

`docs/EVALUATION.md` has the method and the numbers. The objective measure
is an ERB-band signal-to-masker ratio with a spreading function
(`glasberg1990derivation`, `schroeder1979optimizing`), applied with the
exact response of each stem's filter chain. Alongside it the Masking view
reports the paper's own measure: the masking value summed over
occurrences, before and after.

On ten balanced Human Radio stems the 2015 stage finds eight occurrences,
halves the paper's measure at Amount 0.5 and removes it at Amount 1, with
about 1 dB of mean change per stem, and lowers the ERB masked fraction by
under a point. That is the expected size: once levels are right, masking
EQ is a light finish, which matches listening. The spectral-balance stage
moves 7 dB and makes both measures worse on balanced stems.

## 8. Positioning

The tool stops at the clean foundation and hands the creative work back:
it is neither a finished-mix service nor a single smart plugin. The recipe
is re-derivable at any time from the stems and a few knobs, and every
parameter carries its source. Commercial demaskers and assistants, and the
patents around them, are surveyed in
`docs/references/notes/data-driven-and-commercial.md`.

## 9. Next

In order of what the reading list can settle first:

1. Read the unverified parameters out of the papers (essential range,
   max cut, HPF table, boosts) and change their tags.
2. Replace A-weighting with ISO 226:2023 contours at the listening level.
3. Partial-loudness faders (Ward et al.) as a gain-staging method beside
   BS.1770.
4. Automatic compression (`giannoulis2012digital`, `ma2015intelligent`,
   `maddams2012autonomous`) in an AudioWorklet, with a true-peak limiter.
5. A better masking measure (PEAQ ear model, temporal masking, better-ear
   stereo measure) for evaluation, then for the masking test.
6. A listening test with other listeners on datasets with reference mixes
   (Mix Evaluation Dataset, MedleyDB, MUSDB18-HQ).
