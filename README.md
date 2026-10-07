# magic-eq

Browser prototype of a multi-track "gel" EQ. Drop in stems, and the tool derives a
transparent, cut-only EQ for each stem from its own long-term spectrum and the
spectra of the other stems, auditions the result with loudness-matched bypass,
and exports processed stems, the mix, and a JSON recipe you can type into any
16-band parametric EQ.

The point is that no curve is ever stored. Every curve is a pure function of the
stems' spectra, their faders, and a handful of knobs, so "did I cut too much bass
out of the guitar?" is one knob, not a pass over every EQ in the session.

`docs/DESIGN.md` has the model, the prior art, and the plan.

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

## Workflow

1. **Import stems.** Each one is decoded, mixed to mono, and analysed in a Web
   Worker: a Welch-averaged spectrum in 16 log bands (20 Hz to 20 kHz, 0.625
   octave each) over the frames where the stem is actually playing, plus an
   activity gate and the "mode envelope" through its spectral peaks.
2. **Set faders** to the intended mix level, or tick *Stems are post-fader* if
   they were exported with the mix balance baked in. The cross cuts are computed
   at mix level, so this matters.
3. **Turn up Unmask.** Then Scoop, then Flatten if you want it. Every depth knob
   is a contrast in dB: the part of a stem's cut that would be the same in every
   audible band is removed (make-up gain would cancel it anyway), so each knob
   keeps doing something across its whole range, however many stems you load.
4. **A/B.** *Byp* on a stem, or *Bypass all*, is loudness-matched so the louder
   side doesn't win by default. Each stem shows its *effect* (contrast actually
   applied, in dB) and the *overlap* readout is a crude masking score.
5. **Export.** Each stem is rendered through its EQ (including the activity
   following) at its source level, the mix at fader level, and `recipe.json`
   holds the per-band gains, the gate transitions, and the sparse automation.

Four views: **Mix** has the five knobs that matter and a card per stem.
**Advanced** adds per-stem multipliers, band locks, the full model knobs, the
gate settings, and a description of every control. **Matrix** shows who carves
whom (colour) with the editable per-pair weights and the row/column scalars.
**Listen** is a blind, loudness-matched comparison over a loop, with external
renders of the same stems as extra conditions. Hover any control for what it
does and what it interacts with.

Export also reports an objective masking measure (ERB-band signal-to-masker
ratio) on the rendered audio, before and after. `docs/EVALUATION.md` explains
it and has results on real stems; `scripts/evaluate.mjs` runs it from the
command line over any folder of stems.

## Knobs

Mix view (the macro knobs):

| Knob | Symbol | Meaning |
|---|---|---|
| Unmask | W | Depth of the cross-track cuts, as contrast across each stem's audible range. |
| Flatten | α | Damp a stem's own peaks: full depth at its loudest band, nothing at *Flatten reach* below. |
| Scoop | β | Cut the valleys between a stem's modes, leaving the modes at 0 dB. |
| Selectivity | H | 0: cut wherever another stem is at least as loud; 1: only where it clearly dominates. |
| Ceiling | M | Soft limit on any band's total cut (linear to 75%, then compressed). |

Per stem: fader, mute, solo, bypass, *in model*. In Advanced also *Flatten ×*
and *Scoop ×* (multipliers on the global amounts, or absolute dB when
uncoupled), *Carves others* (row scalar), *Accepts cuts* (column scalar, 0 for
leads and vocals), and a 16-band *band lock*.

Advanced model knobs: *Dominance range* (D), *Audible range*, *Flatten reach*
(T), *Scoop reach*, *Combine others* (max / sum / mean), *Couple stem knobs*,
*Psychoacoustic weighting* (A-weighting plus upward spread of masking across
the bands, off by default), *Mix band lock*; and *Follow activity* with
attack, release and threshold.

Flatten and Scoop oppose each other (one cuts peaks, the other cuts valleys);
equal amounts of both tend toward a flat cut that make-up cancels.

## Layout

```
src/dsp/      pure DSP, no DOM: bands, fft, gate, envelope, analyze, model,
              timeline, metrics, wav, recipe
src/audio/    Web Audio: decode, analysis worker, shared live/offline chain
              (graph.js), live engine, offline render, export
src/ui/       React components and the engine hook
src/state/    reducer and selectors
test/         vitest over src/dsp with synthetic stems
scripts/      fixture generator, evaluation CLI
```

`src/ui/params.js` is the single dictionary behind every label and tooltip.

The live chain and the offline render use the same builder, so what you hear is
what you export. The live make-up gain is an estimate from the band spectrum;
the export measures the real RMS and corrects any residual (both numbers go in
the recipe).
