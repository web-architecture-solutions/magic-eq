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

```
P_j(b)  = clip(S_j(b) + L_j - floor, 0, D) / D   # "presence" of j in band b, 0..1
G_ij(b) = - w_ij * P_j(b) * O_ij(b)              # cut i where j is present
```

- `w_ij` (dB): how much of stem `j` to carve out of stem `i`. Stored as a
  matrix but edited through three layers that multiply together:
  a global `W`, a per-source row scalar ("how much does the bass carve
  everyone else"), a per-target column scalar ("how much does the guitar
  accept cuts"), and an optional per-pair override. This is the "one master
  knob" that the manual workflow cannot have.
- `O_ij(b)`: optional overlap weighting, so `i` is only cut where `i` itself
  has energy near `j`. The simplest form is `P_i(b)`; the Hafezi and Reiss
  masking measure is a better one if the simple form proves too blunt.
- Asymmetry gives priority: a lead vocal has a large row scalar and a small
  column scalar.

### Total

```
G_i(b) = clip( G_ii(b) + sum_{j != i} G_ij(b), -maxCut, 0 )
makeup_i = chosen so that loudness(i after EQ) == loudness(i before EQ)
```

`maxCut` and a per-band normalisation by the number of contributing stems
stop cuts from stacking when many stems share a band, which is the failure
mode the literature also has to guard against.

### Time awareness (later)

A whole-song average ignores arrangement: the piano and the guitar may never
play at the same time. The cheap fix that keeps the EQ static is to compute
`P_j` and `O_ij` only over frames where both stems are above an RMS gate.
Section-aware curves (one EQ per song section) are a possible v2, and would
still be static within a section.

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
