# Magic EQ: design note for the prototype

This note captures the mixing technique the tool is meant to automate, what
already exists on the market and in the literature, a formal model that turns
the technique into a handful of knobs, and the smallest prototype that can
tell us whether the idea is worth building for real.

## 1. The technique, restated

For each stem:

1. Read a long-term spectrum in the 16 bands of a standard parametric EQ.
2. Cut the stem along its own spectral shape, gently (1 to 2 dB steps), never
   dB-for-dB. Two sub-flavours exist and get blended by ear:
   - **level**: damp the peaks a little;
   - **scoop**: leave the modes (fundamental, harmonics) at 0 dB and cut the
     valleys between them.
3. Copy every other stem's shape EQ onto this stem, inverted, with master gain
   trimmed to compensate.

Each individual EQ is inaudible on its own. Together they reduce overlap and
let the mix "gel" before any colouration is added.

Assumptions baked into the tool:

- Stems are already well recorded and tonally correct. No surgical repair, no
  sound design, no colour.
- Cuts only. A "boost" from an inverted EQ is modelled as a cut plus make-up
  gain, which is the same thing.
- A wide-spectrum keyboard or pad is left alone (per-track bypass or a weight
  of zero).

The pain point is not the analysis, it is that the inverse cuts are layered
and cannot be re-balanced after the fact without redoing every EQ. The fix is
to never store the curves at all: store the knobs and the spectra, and derive
every curve from them on every change.

## 2. Prior art

### Commercial

| Product | What it does | Gap vs. this idea |
|---|---|---|
| Wavesfactory Trackspacer | 32-band dynamic EQ; cuts the host track with the inverse of a sidechain's spectrum. | Pairwise only, dynamic, realtime. Each pair is a separate instance with its own depth knob, so the N-track balancing problem is still manual. |
| LIM TheMasker (free, University of Milan) | Same idea as Trackspacer, sidechain-driven dynamic masking compensation, VST3/AU/standalone. | Pairwise, dynamic. |
| iZotope Neutron 5 (Masking Meter, Unmask, Inverse Link) | Instances talk to each other. Masking Meter shows overlap between two tracks; Unmask applies a dynamic cut; Inverse Link mirrors one node's boost as a cut on another instance. | Pairwise, one target per instance, manual node-by-node. |
| sonible smart:EQ 4 (Group mode) | Up to 10 instances share analysis. Tracks are dragged into front / middle / back layers and the "smart:filter" carves masking between group members. The closest shipping product. | Black box (also tonally "corrects" toward a learned target, i.e. it colours); hierarchy is three discrete layers, not per-pair weights; realtime instances in a DAW, no stem-in / stem-out workflow; no explicit shape / scoop / inverse model you can inspect. |
| RoEx Automix | Upload stems, get a full automatic mix (level, pan, EQ, compression, reverb). Does detect masking. | Does everything at once and is not transparent-only; no knobs of the kind described here. |

### Academic

The idea is a hand-built instance of what the automatic-mixing literature calls
**cross-adaptive equalisation**:

- Perez-Gonzalez and Reiss, "Automatic equalization of multichannel audio
  using cross-adaptive methods", AES 127 (2009).
- Hafezi and Reiss, "Autonomous multitrack equalization based on masking
  reduction", JAES 63(5), 2015. Defines a simple band-based masking measure,
  builds offline and realtime systems that apply cuts to reduce it, and runs a
  listening test: the offline system with one user parameter beat an amateur
  mix and came close to a professional one.
- Ronan, Ma, Reiss et al., "Automatic minimisation of masking in multitrack
  audio using subgroups" (2018).
- An open MATLAB + JUCE implementation of the 2015 paper exists
  (github.com/arnaurf/Automatic-multi-track-equalizer, bachelor thesis).

### Verdict

The pairwise sidechain carver exists many times over. The N-track version
exists in academia and, commercially, as smart:EQ 4 Group mode. What does not
exist as a product, as far as this search could find, is the specific
workflow described here: static and transparent, an inspectable
shape-then-invert model, a continuous per-pair weight matrix with global and
per-track master knobs, and a stems-in / stems-out batch tool. That is a real
niche, but a narrower one than "nobody does this".

## 3. The model

Everything below is per band `b`, with 16 log-spaced bands covering roughly
20 Hz to 20 kHz (10 octaves, 0.625 octave per band, which matches a 16-band
parametric EQ with Q around 2.3).

### Inputs

- `S_i(b)`: long-term band spectrum of stem `i` in dB. Welch-style average
  of per-frame power (4096-point Hann frames, 50% overlap), not an
  instantaneous peak reading. Normalised so `max_b S_i(b) = 0`.
- `L_i`: the intended mix level of stem `i` in dB. Cross cuts must be computed
  at mix level; a quiet pad should not carve the vocal.
- `E_i(b)`: the mode envelope of `S_i`, i.e. the upper envelope through its
  local maxima. `E_i(b) - S_i(b) >= 0` is the valley depth.

### Self (shape) EQ

```
G_ii(b) = - alpha_i * max(0, S_i(b) - T)      # "level": damp the peaks
          - beta_i  * (E_i(b) - S_i(b))        # "scoop": cut the valleys, keep the modes
```

- `alpha` (0..1, typically 0.1 to 0.3): how much to flatten peaks. 0 keeps
  the bass's bite and string sound at 0 dB.
- `beta` (0..1): how deep to scoop between modes.
- `T`: only bands within `T` dB of the stem's own peak are levelled.

### Cross (inverse) EQ

The self EQ is level-independent; the cross EQ is not. The cut on `i` in
band `b` must be driven by how much `j` dominates `i` there *at mix level*,
not by how loud `j` is relative to its own peak. Normalising every stem to
itself makes a quiet pad carve as hard as the bass; analysing raw record-level
stems carves according to the tracking balance instead of the mix balance.
So either stems are exported post-fader, or the tool has a fader row `L_i`.

```
A_i(b)  = S_i(b) + L_i                            # absolute band level at mix position
D_ij(b) = clip(A_j(b) - A_i(b) + H, 0, D) / D     # how much j dominates i in b, 0..1
G_ij(b) = - w_ij * D_ij(b) * M(b) * M_i(b)        # cut i where j dominates it
```

- `H` (dB): headroom so that a band where `i` and `j` are roughly equal still
  gets a partial cut. If `i` already dominates, cutting it is pointless and
  only thins it, so `D_ij` is 0 there.
- `M(b)` and `M_i(b)` (0..1): per-band masks, one row of 16 at mix level and
  one per track, multiplying the computed cut. A locked band is 0. These are
  the "don't cut here" and "cut less here" controls for sounds that are
  deliberately layered.

- `w_ij` (dB): how much of stem `j` to carve out of stem `i`. Stored as a
  matrix but edited through three layers that multiply together:
  a global `W`, a per-source row scalar ("how much does the bass carve
  everyone else"), a per-target column scalar ("how much does the guitar
  accept cuts"), and an optional per-pair override. This is the "one master
  knob" that the manual workflow cannot have.
- Asymmetry gives priority: a lead vocal has a large row scalar and a column
  scalar of 0, so it carves others but accepts no cuts. This is the formal
  version of "leave leads and vocals out of the process".

### Total

```
G_i(b) = clip( G_ii(b) + sum_{j != i} G_ij(b), -maxCut, 0 )
makeup_i = chosen so that loudness(i after EQ) == loudness(i before EQ)
```

`maxCut` and a per-band normalisation by the number of contributing stems
stop cuts from stacking when many stems share a band, which is the failure
mode the literature also has to guard against.

### Time awareness

A whole-song average ignores arrangement: the piano and the guitar may never
play at the same time. The manual hack (automate the "bass cuts" EQ on when
the bass enters and off when it drops out) is a gate with a slow attack and
release, and it generalises cleanly:

```
a_j(t)     = smoothed RMS gate of stem j, 0..1, attack/release ~ 100s of ms
G_i(b, t)  = G_ii(b) + sum_{j != i} a_j(t) * G_ij(b)
```

Each stem's cuts on everyone else fade in when it plays. The motion is far too
slow to hear as motion, so the result still sounds like a static EQ. The
spectra `S_j` are also computed only over frames where `a_j > 0`, so a stem
that plays for eight bars is not averaged against a song of silence.

A timescale knob slides this from "arrangement" (seconds) toward
Trackspacer-style frame-rate dynamics (ms) if that ever proves worth the
audible motion. Section-aware static curves (one per song section) are an
alternative v2.

### Layerability diagnostic (v2)

Some overlap is intentional: a doubled sine under a kick or bass layers well
because it is simple. A cheap "complexity" score per stem per band (spectral
flatness, number of local modes, crest factor) lets the tool report where
overlap is both high and complex on both sides. That report says where to
listen, re-record, pan, or lock a band; it does not drive cuts.

## 4. How to realise the curves

Two options, and the prototype should support both because they answer
different questions:

- **16 peaking biquads per stem** at the band centres with `Q ~ 2.3`, gain
  `G_i(b)`. Minimum phase, and exactly what a stock DAW parametric EQ can
  reproduce, so the tool can export a "recipe" (centre, Q, gain per band) that
  can be typed into any EQ. This is the honest test of "would this work as a
  plugin".
- **Frequency-sampled linear-phase FIR** from the smoothed curve. Zero
  colouration, no phase interaction between stems, useful as the reference
  for "is the biquad version transparent enough".

Phase: cuts of 1 to 3 dB with moderate Q are benign for mono compatibility.

## 5. Transparency checks to build in from day one

- Loudness-matched bypass per stem and on the mix. Unmatched A/B always makes
  the louder one sound better.
- A "total cut per band" readout per stem, so stacking is visible.
- A crude masking score before and after (sum over pairs and bands of
  `min(P_i, P_j)`), mirroring the objective metric in the literature. Not a
  substitute for listening, but a cheap progress number.

## 6. The VST question

Three ways to get this into a DAW, in order of realism:

1. **One instance per track, shared group** (what sonible and iZotope do).
   Instances in the same host process find each other through a shared
   singleton or shared memory, any instance can open the matrix view. This is
   proven to work but is the most engineering.
2. **One instance on the master that sees every track.** Not feasible: VST3
   and AU give a plugin at most one or a few sidechain buses, and hosts do not
   expose other tracks' audio to it.
3. **Standalone analysis, dumb per-track playback.** Because the curves are
   static, the cross-track "communication" only has to happen at analysis
   time. The standalone tool analyses the stems and exports either processed
   stems or a per-track EQ recipe. A trivial per-track plugin, or the DAW's
   stock EQ, then plays the recipe. No inter-plugin communication at all.

Option 3 is the one to prototype, and it may be good enough to ship. Option 1
is the eventual "real" product if realtime re-analysis turns out to matter.

### Shrinking the round trip

Record in the DAW, bulk-export stems, process, re-import is one round trip,
and every major DAW does bulk stem export. Ways to make it cheaper:

- **Export a recipe, not audio.** 16 band gains per track, pasted into the
  DAW's own EQ, keeps the DAW as the source of truth. The time gating is lost
  unless on/off automation is also written.
- **Script the DAW.** In Reaper, ReaScript (Lua or Python) can render stems,
  call the analysis, set ReaEQ band gains, and write the gate envelopes as
  automation, with nothing to compile. This is the most streamlined path
  available without writing a plugin.
- **Watch a folder.** The tool processes whatever lands in the DAW's stem
  export folder and writes processed stems and the recipe next to it.
  Crude, but DAW-agnostic.
- Whichever path: stems must carry their mix level (post-fader export, or a
  fader row in the tool), see the cross EQ section.

## 7. Repo state

- The existing code is a Create React App 4 shell with Tone.js: a play button
  and a 16-band readout from a live FFT.
- `src/components/AudioAnalyzer/hooks.js` slices the FFT into 16 **linear**
  bands. With a 2048-point FFT at 44.1 kHz each band is about 1.4 kHz wide, so
  band 1 covers 0 to 1378 Hz (all of the bass, low mids and most fundamentals)
  and the other 15 bands cover only the top of the spectrum. Bands must be
  log-spaced.
- react-scripts 4 (2021) does not run cleanly on Node 17+ without
  `NODE_OPTIONS=--openssl-legacy-provider`. The container has Node 22.
  Recommendation: restart on Vite. Tone.js is not needed; plain Web Audio
  (`decodeAudioData`, `BiquadFilterNode`, `OfflineAudioContext`) covers
  analysis, audition and export.

## 8. Smallest prototype that answers the question

Keep the DSP in a plain module with no DOM so it can be unit-tested in Node
against synthetic stems (e.g. two band-limited noise bursts with known
spectra) before any UI exists.

1. **Analysis** (`analyze.js`): decode WAV stems, Welch band spectrum in 16
   log bands, mode envelope, RMS gate per frame. Pure functions over
   `Float32Array`s.
2. **Model** (`model.js`): `deriveCurves(spectra, knobs) -> G[i][b]` and the
   make-up gain. Pure, instant, re-run on every knob change.
3. **Audition** (browser): load stems, play them summed through 16 peaking
   biquads each, solo / mute, loudness-matched bypass, the knob panel and the
   `w_ij` matrix. Show each stem's spectrum, its derived curve and the total
   cut per band.
4. **Export**: render each stem through an `OfflineAudioContext` with the same
   biquads, encode WAV (24-bit), download; also export the mix and a JSON
   recipe (centre, Q, gain per band per stem).

Roughly 600 to 800 lines of JavaScript. The milestone that proves the concept
is step 3 with two or three stems (bass, guitar, keys) and the global `W` knob:
if sweeping `W` from 0 to a few dB at matched loudness audibly separates the
stems without sounding thinner, the idea works and the rest is UI.

## 9. Implementation notes (v1 as built)

The v1 prototype lives in `src/`; see the README for the layout and knobs.
Decisions made while building that refine section 3:

- **Absolute spectra.** Analysis returns `bandDb` calibrated so a full-scale
  sine reads 0 dB in its band; `S = bandDb - peakDb` feeds the self EQ and the
  display, and the cross EQ uses `bandDb + fader`.
- **Floor.** No cross cuts where the target is more than `floorDb` (default
  40 dB) below its own peak. Without it, a stem's silent bands count as
  dominated by everyone and the stacking readout becomes meaningless.
- **Stacking.** The cross sum is divided by `n^stackNorm` (default 0.5) where
  `n` is the number of stems contributing a cut to that band, then clamped.
- **Gate.** `a_j(t)` is the one-pole response of the stem's gate transitions,
  which is exactly `AudioParam.setTargetAtTime`, so the live graph, the offline
  render, the recipe and the tests all agree. Per stem and band there is one
  event per transition of any source with a non-zero cut there.
- **Make-up.** Live playback uses the band-spectrum estimate; export measures
  the rendered RMS and applies the residual, recording both in the recipe.
- **Export** ignores solo/mute, renders stems at source level (fader 0) and the
  mix at fader level, and optionally trims the mix to -1 dBFS if it clips.

## 10. v2: contrast-normalised, dB-denominated model

Testing v1 on a real ten-stem session showed the model collapsing: up to
nine sources each added a dominance-weighted cut to every band, the stacked
sum hit the ceiling almost everywhere, and a uniform cut followed by make-up
gain is identity. The self terms were in "fraction of spectral depth" units
and saturated the same ceiling. Only a narrow region of parameter space did
anything, which is exactly what the user reported.

The v2 model (implemented in `src/dsp/model.js`) keeps the idea and changes
the parametrisation so every depth knob is a contrast in dB:

```
audible_i   = { b : S_i(b) >= floorDb }                     floorDb default -24
silent_i    = { b : S_i(b) <  -60 }                         no cuts, no gate events

level_i(b)  = -Level * mul_i * clip((S_i(b) - T) / (-T), 0, 1)
scoop_i(b)  = -Scoop * mul_i * clip((E_i(b) - S_i(b)) / scoopRange, 0, 1)

w_ij        = rowScale_j * pair[j][i]                        source-side weight
D_ij(b)     = clip(A_j(b) - A_i(b) + H, 0, D) / D,   H = (1 - Selectivity) * D
frac_i(b)   = max_j w_ij D_ij(b)        (or power sum of the others, or mean)
m_i         = min over audible_i of frac_i                   the flat part
con_i(b)    = max(0, frac_i(b) - m_i) * masks                masks after the min
cross_i(b)  = -Unmask * colScale_i * con_i(b)
G_i(b)      = softclamp(level + scoop + cross, Ceiling)     linear to 75%, tanh knee
```

Why max: a weighted mean dilutes the cut whenever a stem that competes
nowhere is added, and dividing by summed weights cancels the per-stem
scalars. With max, adding a stem that dominates nowhere changes nothing and
N = 2 reduces to the pairwise model. On the real stems the power-sum variant
collapses several stems back to flat.

The gated path (`src/dsp/timeline.js`) runs the same `combineCross` and
`finishGain` with the gated source state and the static all-on `m_i`, so a cut
can only shrink when a source drops out.

Readouts: *effect* (max minus min of the cut over the audible range), *flat
removed* (Unmask × colScale × m_i), bands at the ceiling, and the pairwise
dominance that colours the matrix.

## 11. Where this sits against the field, and how it is measured

Pairwise demaskers (TheMasker, pure:unmask, D·MASK, Soothe in sidechain
mode) and the newer cross-track group products (Spectral Engine, Spectral
Agent 2, smart:EQ 4 groups, AutoDeMasker) are all dynamic processors with a
sidechain pair or a priority hierarchy, most on ERB or Bark excitation
models. This tool is static (gated-static), symmetric and
contrast-normalised, works on 16 fixed EQ bands, exports a recipe, and adds
the mode-aware self terms. It is closest to Hafezi & Reiss (2015): a
simplified band-energy masking measure, parametric EQ cuts, one user
parameter. It departs from the literature's "masker = sum of all others"
framing, which collapses to flat with many stems; the contrast
normalisation is this tool's addition.

`docs/EVALUATION.md` has the measurement method (ERB signal-to-masker ratio
with spreading, plus a blind listening page) and the first results on real
stems. In short: the objective effect of 3 to 6 dB static cuts is under one
point of masked fraction on a balanced ten-stem mix, because level and
density dominate the metric. The listening test decides whether that is the
"subtle but real" of the manual technique or nothing at all.

## 12. Positioning: an arrangement model, not an ear model

The demaskers and their literature model the ear: ERB or Bark excitation
patterns, spreading functions, masking thresholds, partial loudness. Their
defining controls fall out of that threshold: attack and release because
the threshold moves with the signal, detection resolution, and "drive" by
overdriving the sidechain so more of the input falls under the threshold
(TheMasker's input level with output compensation).

This tool models the arrangement: long-term spectra, which bands each part
occupies, and a rule for how much each part defers where others live. That
is the best-practice tradition (Hafezi & Reiss's "simplified measure based
on best practice"; Pestana & Reiss's compiled mixing rules) rather than
psychoacoustics, and its goal is the manual technique's: fit together
before colour, without flattening, and leave the mud in when it is the
vibe. Masking metrics are therefore diagnostics here, not objectives
(`docs/EVALUATION.md`).

Consequences for the controls:

- The thresholds are guardrails chosen from the technique, not
  psychoacoustic facts. The ceiling defaults to 9 dB with a soft knee, both
  adjustable in the view, and the UI says so.
- The demaskers' drive move maps onto two of our controls. A global masker
  offset is exactly Selectivity (headroom H). A per-stem offset is Presence:
  an analysis-only level shift in the dominance test, both as masker and
  as maskee, which playback and make-up never see. Presence vs the older
  "carves others" multiplier is a setting.
- Attribution: every cut is the sum of three terms (Unmask, Flatten, Scoop),
  drawn stacked, with a hover on each knob to show its share across the
  session, so "which parameter affects what" is visible rather than
  explained.
- Band locks cover every term, so a locked band is truly untouched.
- Settings (how the model is configured) are separated from mix state and
  persisted; mix state never is.

## 13. Gain staging

Everything downstream is confounded by level: the dominance test, the
masking metric and the ear all decide by who is louder before any EQ runs.
The manual method (set each track just audible over pink noise, then push
kick and bass up and hats down) is a practitioner approximation of what the
automatic-mixing literature does formally. Mansbridge, Finn & Reiss (2012)
set faders by EBU R128 / ITU BS.1770 loudness toward a common target with a
hysteresis gate; De Man et al. and Wilson & Fazenda measured where
instruments sit relative to the mix in professional mixes (lead vocal on
top by roughly 3 LU in some studies and more in others, drums and bass
lower, large per-song spread). Pestana & Reiss list equal loudness as a
starting rule.

The Gain workspace implements that: per-stem integrated loudness
(`src/dsp/loudness.js`, K-weighting from the prewarped analog prototype so
any sample rate matches the Annex 1 table, 400 ms blocks, absolute and
relative gates, per-channel power with mono treated as dual-mono because
the engine plays it on both speakers), `Balance = target + roleOffset −
LUFS`, anchored so the loudest resulting fader is 0 dB (the model is
invariant to a global offset, so anchoring is a convention, not safety).
Role offsets are heuristics, editable, with two known biases: K-weighting
under-counts low frequencies, and gating makes a sparse crash and a
continuous pad at equal loudness unequal in prominence. Trims are the
user's and survive a re-balance.

Why K-weighting rather than the pink trick: on 0.625-octave bands pink noise
reads flat, so the band-domain version of the trick is just "loudest band
to target" (offered as Peak band). The faithful version uses per-frame ERB
spectra against a pink slope and the 95th percentile over active frames
(offered as Pink reference); it reproduces the method's treble bias
because narrow bands at high frequencies hold less pink power. Loudness
weighting is what the bias was compensating for by hand.

Headroom is predicted without rendering from per-frame peaks: a coherent
sum (upper bound) and a root-sum-square (uncorrelated estimate); the master
trim suggestion aims the bound at −6 dBFS, and the live master meter is
the truth.

The overlay at the top of the Mix workspace draws every stem's long-term
ERB spectrum at mix level with an overlap strip (stems within 6 dB of the
band's loudest and within 30 dB of their own peak). It shows overlap, not
a problem: whether the overlap is mud or vibe is the listening decision.

## 14. The Literature flow

The Magic flow is this tool's own model. Its ancestry is the literature,
but it departs from it in the direction of cuts (maskee, not masker), the
contrast normalisation, the max-combine across maskers, the self terms,
the soft ceiling and the activity following. Rather than keep arguing
about fidelity inside one model, the app now carries a second, entirely
parallel flow (`src/dsp/litModel.js`) that implements the published
cross-adaptive methods as literally as the accessible sources allow, and
a nav switch (Magic | Literature) that chooses which one derives the
curves. Everything downstream (engine, plots, matrix, export, evaluation)
consumes either flow's output unchanged.

Rule for building it: where the paper states a value or a direction, use
it; where the method implies a choice but no value is given, infer one and
tag it; where we had to decide because the full text was not accessible,
tag it unverified; and wherever the literature and the Magic flow diverge,
make the divergence a control rather than picking a side. The tags are in
`src/ui/litParams.js` and shown on every row of the panel.

### Stages

**A. Spectral balance.** Perez-Gonzalez & Reiss (2009), "Automatic
equalization of multi-channel audio using cross-adaptive methods":
accumulate each channel's per-band loudness over the track with a
perceptual weighting, and drive each channel's band gain toward the
cross-channel average so every channel has equal perceptual loudness in
every band. Here: `L_i(b) = bandDb_i(b) + fader_i + w(b)`, `w` = A-weighting
(the 40-phon approximation; a secondary source names ISO 226),
`level_i(b) = Amount × (avg_b − L_i(b))`, clipped to the max cut and, if
boosts are allowed, the max boost. Silent bands (S < −60 dB) are left out
of the average and untouched. This stage is aggressive by construction:
equal loudness per band across channels is the paper's goal, so a bass that
is 12 dB louder than everything below 100 Hz is cut hard there. Amount
scales it.

**B. Masking reduction.** Hafezi & Reiss (2015), "Autonomous multitrack
equalization based on masking reduction", JAES 63(5). Their simplified
masking measure: masker i masks maskee j in a region when i is louder
there, the region is essential for j and nonessential for i. The offline
(semi-autonomous) system attenuates the masker at the frequencies where it
dominates; at most three occurrences with the highest masking value per
track are equalised with three peaking filters in series; fixed Q of 2;
the gain is taken from the masking value; and the whole system has one
user parameter, which the listening test found took a raw mix past the
amateur mixes and close to the professional one. Here: essential =
within *Essential range* of the stem's own loudest band (unverified
threshold); masking value `m = (L_i − L_j) × pairWeight × rowScale` on
every band that passes the test; the top-K occurrences per cut target,
one filter per band, `cross_t(b) = −Amount × m × colScale`; the cut
target is the masker (paper) or the maskee (Magic's direction) by a
control; the chain's peaking filters all take Q = *Filter Q* while the
flow is active, instead of the band-matched Q the Magic flow uses. The
panel reports the paper's own kind of objective, the summed masking value
over occurrences, before and after the EQ.

**C. High-pass by role.** De Man & Reiss (2013), "A knowledge-engineered
autonomous mixing system": rule families compiled from mixing textbooks,
among them a high-pass on everything that is not a low-frequency
instrument. Here: a second-order Butterworth high-pass at *High-pass
frequency* on every stem whose role is not kick, bass, drums or room. The
frequency and the role list are unverified (the paper's table was not
accessible; textbooks range 60 to 120 Hz).

**Total**: `G_i(b) = clip(level_i(b) + cross_i(b), −maxCut, maxBoost)`,
band locks applied to both terms, loudness-match make-up as in the Magic
flow (ours; kept so A/B against bypass is fair, and switchable off). The
literature's offline systems are static, so activity following is off in
this flow.

### Provenance of every control

| Control | Tag | Where it comes from |
|---|---|---|
| Amount | documented | one user parameter (Hafezi & Reiss 2015) |
| Masking reduction on/off | documented | the method itself |
| Cut masker / maskee | documented (masker) | the paper cuts the masker; maskee is Magic's direction, kept as the divergence toggle |
| Essential range | unverified | threshold for essential vs nonessential is not in accessible text |
| Filters per track | documented | at most three occurrences per track |
| Filter Q | documented | fixed Q of 2 |
| Max cut | unverified | gain taken from the masking value; no clamp stated |
| Spectral balance on/off | documented | Perez-Gonzalez & Reiss 2009 |
| Perceptual weighting | inferred | the paper weights perceptually; A-weighting stands in for ISO 226 |
| Allow boosts | unverified | not stated; off keeps the cut-only rule from Pestana & Reiss |
| High-pass by role | documented | De Man & Reiss 2013 rule family |
| High-pass frequency | unverified | textbook range |
| Loudness-match make-up | ours | not in the papers |

### Not implemented

- Ward, Reiss & Athwal (2012): faders by equal partial loudness (Glasberg &
  Moore). Needs a partial-loudness model; the Gain workspace uses BS.1770
  loudness instead (Mansbridge, Finn & Reiss 2012).
- Ronan et al. (2018): EQ and compression chosen by optimising an MPEG-style
  masking metric with particle swarm, with subgrouping. An optimiser, not a
  rule; the nearest thing here is the ERB signal-to-masker metric in
  Evaluate.
- Hafezi & Reiss's real-time variant (1024-sample frames, low latency).
  This flow is the offline, whole-track version, which their test preferred.
- Free filter centres at FFT peaks. Filters sit on the 16 fixed band
  centres, so the recipe stays typeable into any parametric EQ.

### What the comparison shows

`scripts/evaluate.mjs --presets bypass,defaults,lit,litMaskee,litAmount1,litBalance,litBalanceAmount1`
on the ten Human Radio stems with the loudness balance (tables in
`docs/EVALUATION.md`). Three things fall out:

- The 2015 masking stage alone finds eight occurrences on ten balanced
  stems and halves the paper's own measure at Amount 0.5 (11.4 to 5.8
  dB·occ) and removes it at Amount 1 (0.2 dB·occ), with about 1 dB of mean
  effect: "louder in a band nonessential for the masker" is rare once every
  stem's loud bands are its own. The paper's test is written for the raw,
  unbalanced case; the Gain workspace has already done most of its work.
  Cutting the maskee instead (Magic's direction) raises the paper's
  measure, by construction.
- The 2009 spectral-balance stage is where the large gains come from (7 dB
  mean effect at Amount 0.5), and on balanced stems it raises the 2015
  masking measure, because equal loudness per band means cutting every
  stem's own loud bands, which are exactly the bands the masking test
  calls essential. The two papers are separate systems with different
  objectives; combining them is our choice, so the balance stage is a
  toggle and off by default.
- Neither flow moves the ERB masked fraction by more than a few points.
  Level and density decide that metric (§11), which is why the switch
  exists: both flows can be heard on the same stems with the same faders.
