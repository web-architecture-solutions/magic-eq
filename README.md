# magic-eq

A browser tool that builds the base layer of a mix from multitrack stems: a
balanced, transparent mix with the overlap between parts reduced, before
any colour goes on. Every step comes from the published automatic-mixing
and psychoacoustics literature, and every parameter says where it comes
from and whether the value is documented, inferred or unverified.

Drop in stems. The tool balances them by loudness, derives a gentle
masking-reduction EQ for each stem from the long-term spectra of all of
them, lets you compare raw, balanced and EQ'd at matched loudness, and
exports processed stems, the mix, and a JSON recipe you can type into any
parametric EQ. No curve is stored: every curve is recomputed from the
stems, the faders and a few knobs, so rebalancing after the fact is one
knob, not a pass over every EQ in the session.

- `docs/DESIGN.md`: the pipeline, the methods and the provenance of every
  parameter.
- `docs/EVALUATION.md`: how it is measured and the results on real stems.
- `docs/references/`: the reading list (`library.bib`, 350 entries) and its
  addendum with reading priorities, datasets, tools and products.

An earlier, home-grown EQ model and its history are on the branch
`archive/magic-eq-original`.

## Run it

```
npm install
npm run fixtures   # writes three synthetic stems (bass, guitar, pad) to fixtures/
npm run dev        # then open the URL it prints and drop the fixtures in
npm test           # pure DSP modules against synthetic stems
npm run build
```

Stems should be WAV (16/24/32-bit or float). The first stem sets the session
sample rate; later stems at a different rate are resampled to it on load.

## Workspaces

**Gain.** One fader strip per stem with its integrated loudness (ITU-R
BS.1770, K-weighted and gated, measured per channel), sample peak, a role
guessed from the file name, the automatic fader, your trim and a live
meter. *Balance* sets every stem to equal loudness plus its role offset
(after Mansbridge, Finn & Reiss 2012; offsets editable in Settings), then
shifts everything so the loudest fader is 0 dB. Trims survive a
re-balance. The master row predicts the mix peak and offers a master trim
aimed at a peak target (−6 dBFS by default).

**EQ.** The EQ panel and a card per stem with its spectrum and its EQ,
stacked by stage, plus an overlay of every stem's long-term spectrum at
mix level with a strip of how many stems compete in each band. The EQ has
three stages:

1. *Masking reduction* (Hafezi & Reiss 2015, offline system): where one
   stem is louder than another in a band that is essential to the quieter
   one and nonessential to the louder one, the louder one is cut there by
   the masking value times *Amount*; at most three filters per stem, Q 2.
2. *Spectral balance* (Perez Gonzalez & Reiss 2009), off by default: each
   stem's band loudness pushed toward the cross-channel average.
3. *High-pass by role* (De Man & Reiss 2013): a high-pass on every stem
   that is not kick, bass, drums or room.

Every control is tagged **documented**, **inferred** or **unverified**;
hover for the source. Where this tool departs from a paper, the departure
is a control (cut the maskee instead, allow boosts, weighting, essential
range, filters per track, Q, max cut, high-pass frequency, make-up).

**Masking.** Who masks whom, read-only: a matrix of the masking value
between every pair of stems, and the list of occurrences the EQ acts on,
with the paper's own measure before and after.

**Listen.** A blind comparison over a loop of the raw stems, the balanced
faders and the EQ, plus external renders of the same stems from other
tools, each matched to the same BS.1770 loudness, shuffled and lettered.

## Listening at matched loudness

The transport switches what plays: **Raw** (every stem at 0 dB, no EQ),
**Balanced** (the Gain workspace's faders, no EQ) and **EQ**. Keys 1, 2
and 3 switch; space plays. With *match* on, every condition plays at the
same integrated loudness (−20 LUFS by default) through a monitor gain
after the master, so louder never wins by default. The loudness of each
condition is predicted from the analysis, so switching is instant; the
readout beside it is the measured short-term loudness of what you hear.
The monitor gain never reaches the export. *Byp* on a stem compares that
stem at matched loudness through its make-up gain.

## Export

Each stem rendered through its EQ at its source level, the mix at fader
level (optionally trimmed to −1 dBFS), and `recipe.json` (version 3):
per stem the fader, high-pass, 16 band gains at one Q, and make-up, plus
the band centres and the EQ settings. Export also reports the ERB-band
signal-to-masker ratio of the rendered audio, before and after;
`scripts/evaluate.mjs` runs the same measure from the command line over
any folder of stems.

## Settings

The gear opens Settings, saved in the browser: loudness target, peak
target and role offsets for gain staging; audible range and activity
threshold for the analysis. EQ settings and mix state are not saved.

## Layout

```
src/dsp/      pure DSP, no DOM: bands, fft, gate, analyze, loudness (BS.1770),
              roles, balance, litModel (the EQ), common, mixLoudness
              (loudness matching), metrics, wav, recipe
src/audio/    Web Audio: decode, analysis worker, shared live/offline chain
              (graph.js), live engine with monitor and loudness meter,
              offline render, export
src/ui/       React components and the engine hook
src/state/    reducer, settings
test/         vitest over src/dsp with synthetic stems
scripts/      fixture generator, evaluation CLI
docs/         design, evaluation, references, papers
```

`src/ui/litParams.js` holds the name, provenance tag and source of every EQ
control; `src/ui/params.js` does the same for the gain and analysis
controls.
