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

1. **Drop stems.** Each one is decoded, mixed to mono, and analysed in a Web
   Worker: a Welch-averaged spectrum in 16 log bands (20 Hz to 20 kHz, 0.625
   octave each) over the frames where the stem is actually playing, plus an
   activity gate and the "mode envelope" through its spectral peaks.
2. **Set faders** to the intended mix level, or tick *stems are post-fader* if
   they were exported with the mix balance baked in. The cross cuts are computed
   at mix level, so this matters.
3. **Turn up W.** That is the one master knob: how deep each stem's cuts on the
   others go. Everything else is a refinement.
4. **A/B.** *Byp* on a stem, or *Bypass all*, is loudness-matched so the louder
   side doesn't win by default. The *overlap* readout is a crude masking score
   (sum over pairs and bands of the overlapping power), before vs after.
5. **Export.** Each stem is rendered through its EQ (including the gate
   automation) at its source level, the mix at fader level, and `recipe.json`
   holds the per-band gains, the gate transitions, and the sparse automation.

## Knobs

Per stem:

| Control | Meaning |
|---|---|
| fader | Intended mix level, used for the cross cuts only. |
| level α | Damp the stem's own peaks (bands within *T* dB of its peak). |
| scoop β | Cut the valleys between the stem's modes; leaves the modes at 0 dB. |
| carves × | Row scalar: how hard this stem carves the others. |
| accepts × | Column scalar: how much this stem accepts cuts. 0 for leads and vocals. |
| mask | Per-band multiplier (1, ½, 0) on this stem's cuts. 0 locks a band. |
| in model | Untick to leave a stem untouched and uncarving (a wide pad, say). |

Mix level:

| Knob | Meaning |
|---|---|
| cross depth W | Global cut depth in dB. The master knob. |
| headroom H | A band is cut even when the other stem is up to *H* dB quieter there. |
| range D | Dominance (in dB) at which the cut reaches full depth. |
| max cut | Clamp on any band's total cut. |
| stacking | Divide stacked cuts by n^stacking (0 = plain sum, 1 = average). |
| floor | No cross cuts where the target is this far below its own peak. |
| level thresh. T | The α term only touches bands within *T* dB of the peak. |
| mix mask | Per-band multiplier on every cut in the session. |
| pair weights | N×N grid: row carves column, multiplied with the scalars and W. |
| gate | Each stem's cuts on the others fade in (attack) while it plays and out (release) when it stops. The threshold needs a re-analysis. |

## Layout

```
src/dsp/      pure DSP, no DOM: bands, fft, gate, envelope, analyze, model,
              timeline, wav, recipe
src/audio/    Web Audio: decode, analysis worker, shared live/offline chain
              (graph.js), live engine, offline render, export
src/ui/       React components and the engine hook
src/state/    reducer and selectors
test/         vitest over src/dsp with synthetic stems
scripts/      fixture generator
```

The live chain and the offline render use the same builder, so what you hear is
what you export. The live make-up gain is an estimate from the band spectrum;
the export measures the real RMS and corrects any residual (both numbers go in
the recipe).
