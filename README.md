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

## Workspaces

**Gain** comes first: one fader strip per stem with its integrated loudness
(ITU BS.1770, K-weighted and gated, measured per channel), sample peak, a
role guessed from the file name, the automatic fader, your trim, and a live
meter. *Balance* equalises every stem's loudness to the target plus its
role offset (lead vocal on top; drums, bass, cymbals and room mics lower;
all editable in Settings), then shifts everything so the loudest fader
lands at 0 dB: nothing is ever boosted. Trims survive a re-balance. The
master row predicts the mix peak from the stems' per-frame peaks (a
coherent-sum bound and an uncorrelated estimate) and offers a master trim
that aims it at a peak target (−6 dBFS by default, editable down to 0). Two alternative methods exist for comparison: a
peak-band rule, and a pink reference that reproduces the manual
pink-noise trick on per-frame ERB spectra, bias included.

**Mix** holds the EQ work, with an overlay at the top showing every stem's
long-term spectrum at mix level and a strip of how many stems compete in
each band. Its sub-views are Simple, Advanced, Matrix and Listen.

## Workflow

1. **Import stems.** Each one is decoded and analysed in a Web Worker: a
   Welch-averaged spectrum in 16 log bands (20 Hz to 20 kHz, 0.625 octave
   each) over the frames where the stem is actually playing, an activity
   gate, the "mode envelope" through its spectral peaks, per-channel loudness
   and peaks, and a long-term ERB spectrum for the overlay.
2. **Balance** in the Gain workspace (or tick *Stems are post-fader* if the
   stems were exported with the mix balance baked in). The cross cuts are
   computed at mix level, so this matters.
3. **Turn up Depth.** Then Valley cut, then Peak taming if you want it. Every depth knob
   is a contrast in dB: the part of a stem's cut that would be the same in every
   audible band is removed (make-up gain would cancel it anyway), so each knob
   keeps doing something across its whole range, however many stems you load.
4. **A/B.** The transport switches what plays: **Raw** (every stem at 0 dB,
   no EQ, the session as tracked), **Balanced** (the Gain workspace's faders,
   no EQ) and **EQ** (faders plus the active model). Keys 1, 2 and 3 switch,
   space plays. With *match* on, every condition plays at the same
   integrated loudness (−20 LUFS by default) through a monitor gain after
   the master, so louder never wins by default and gain staging can be
   heard on its own. The loudness of each condition is predicted from the
   analysis (each stem's BS.1770 loudness, fader, make-up, and the exact
   response of its filters on its long-term spectrum), so switching is
   instant; the readout beside it is the measured short-term loudness of
   what you hear. The monitor gain never reaches the export. *Byp* on a
   stem is loudness-matched by its make-up. The *overlap* readout is a
   crude masking score.
5. **Export.** Each stem is rendered through its EQ (including the activity
   following) at its source level, the mix at fader level, and `recipe.json`
   holds the per-band gains, the gate transitions, and the sparse automation.

Four views: **Mix** has a preset menu, the five knobs that matter (with Knee
next to Max cut), and a card per stem. Hover Depth, Peak taming or Valley cut
to see that knob's share of every stem's cut; the cut bars are stacked by term.
**Advanced** adds per-stem multipliers, band locks, the full model knobs, the
gate settings, and a description of every control. **Matrix** shows who carves
whom (colour) with the editable per-pair weights and the row/column scalars.
**Listen** is a blind comparison over a loop of the raw stems, the balanced
faders and both EQ models, each matched to the same BS.1770 loudness, with external
renders of the same stems as extra conditions. Hover any control for what it
does and what it interacts with. The gear in the nav opens **Settings**: how
the model is configured (stem drive, coupling, combine mode, psychoacoustic
weighting, dominance range, audible range, reach, activity threshold), saved
in the browser; mix state is never saved.

Export also reports an objective masking measure (ERB-band signal-to-masker
ratio) on the rendered audio, before and after. `docs/EVALUATION.md` explains
it and has results on real stems; `scripts/evaluate.mjs` runs it from the
command line over any folder of stems.

## Two flows: Magic and Literature

The **Magic | Literature** switch in the nav picks which model derives the
curves. Everything else (stems, faders, the matrix, band locks, A/B, export)
is shared, and the choice is saved with the settings.

**Magic** is this tool's model: contrast-normalised cuts on the maskee where
another stem dominates, plus the two shape terms, with activity following.

**Literature** is a parallel implementation of the published cross-adaptive
methods, as faithfully as the accessible sources allow, in three stages:

1. *Masking reduction* (Hafezi & Reiss 2015, offline system): a masking
   occurrence is a band where one stem is louder than another, the band is
   essential for the quieter one and nonessential for the louder one. The
   masker is cut there by the masking value; at most three occurrences per
   track; peaking filters with Q 2; one user parameter (Amount) scales
   everything.
2. *Spectral balance* (Perez-Gonzalez & Reiss 2009): each stem's perceptually
   weighted band loudness is pushed toward the cross-channel average in that
   band. A separate system from the first, so it is a toggle, off by
   default: on balanced stems it works against the 2015 masking measure.
3. *High-pass by role* (De Man & Reiss 2013 rules): a high-pass on every
   stem that is not kick, bass, drums or room.

Its panel replaces the macro knobs. Every control carries a provenance tag:
**documented** (stated in the paper or a source citing it), **inferred**
(follows from the method, no value given) or **unverified** (our choice,
because the full text was not accessible). Where the literature and this
tool diverge, the divergence is a control: *Cut* masker (paper) or maskee
(Magic's direction), *Allow boosts*, *Perceptual weighting*, *Essential
range*, *Filters per track*, *Filter Q*, *Max cut*, *High-pass frequency*,
and the loudness-match make-up, which is ours. The panel also shows the
paper's own kind of measure (summed masking value over occurrences) before
and after, and lists what is not implemented and why (Ward's partial
loudness faders, Ronan's optimiser, the real-time frame-wise variant, free
filter centres). The literature flow is static: activity following is off
while it is active, and the recipe records `flow`, the filter Q and each
stem's high-pass. `docs/DESIGN.md` §14 has the per-parameter provenance.

## Knobs

Mix view (the macro knobs):

| Knob | Symbol | Meaning |
|---|---|---|
| Depth (was Unmask) | W | Depth of the cross-track cuts, as contrast across each stem's audible range. |
| Peak taming (was Flatten) | α | Damp a stem's own peaks: full depth at its loudest band, nothing at *Flatten reach* below. |
| Valley cut (was Scoop) | β | Cut the valleys between a stem's modes, leaving the modes at 0 dB. |
| Threshold (was Selectivity) | H | 0: cut wherever another stem is at least as loud; 1: only where it clearly dominates. |
| Max cut (was Ceiling) | M | Limit on any band's total cut. A preference, not a rule: push it if it sounds better. |
| Knee | | 0 is a hard clamp; above 0 the cut compresses from (1 − knee) of the max cut. |

Per stem: fader, mute, solo, bypass, *in model*. In Advanced also *Flatten ×*
and *Scoop ×* (multipliers on the global amounts, or absolute dB when
uncoupled), *Presence* (analysis-only level offset in the dominance test, the
demaskers' input-level trick per stem; or *Carves others* as a multiplier,
chosen in Settings), *Accepts cuts* (column scalar, 0 for leads and vocals),
and a 16-band *band lock* that covers every term.

Settings: *Stem drive*, *Couple stem knobs*, *Combine others* (max / sum /
mean), *Psychoacoustic weighting* (A-weighting plus upward spread of masking
across the bands, off by default), *Dominance range* (D), *Audible range*,
*Flatten reach* (T), *Scoop reach*, *Activity threshold*. Advanced: *Mix band
lock* with lock presets, *Follow activity* with attack and release.

Peak taming and Valley cut oppose each other (one cuts peaks, the other cuts
valleys); equal amounts of both tend toward a flat cut that make-up cancels.
Hover Depth, Peak taming or Valley cut to see that term's share of every
stem's cut; the cut bars are stacked by term.

## Layout

```
src/dsp/      pure DSP, no DOM: bands, fft, gate, envelope, analyze, model,
              litModel (the literature flow), timeline, metrics, loudness
              (BS.1770), roles, balance, wav, recipe
src/audio/    Web Audio: decode, analysis worker, shared live/offline chain
              (graph.js), live engine, offline render, export
src/ui/       React components and the engine hook
src/state/    reducer and selectors
test/         vitest over src/dsp with synthetic stems
scripts/      fixture generator, evaluation CLI
```

`src/ui/params.js` is the single dictionary behind every label and tooltip;
`src/ui/litParams.js` is the same for the literature flow, with provenance.

The live chain and the offline render use the same builder, so what you hear is
what you export. The live make-up gain is an estimate from the band spectrum;
the export measures the real RMS and corrects any residual (both numbers go in
the recipe).
