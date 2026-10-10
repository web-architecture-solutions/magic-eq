# B: Dynamics, time-based effects, mastering automation, EQ/filter DSP — notes

The .bib has 75 entries: 44 `verified = {yes}` and 31 `verified = {partial}`.

**Search limit.** Searching stopped early because the shared web-search budget for this turn (200 calls across all agents) ran out. Most of the core papers were confirmed before that happened. The partial entries are explained under (a) and need one more search pass before final citation.

## (a) Items not pinned down

### In library.bib as `partial`, with the fields that need checking

| Key | What is from memory |
|---|---|
| mcnally1984dynamic | Author's first name (only "G. W." confirmed) and issue number. Vol 32, pp. 316–327 and the year are confirmed. |
| stikvoort1986digital, kraght2000aliasing, linkwitz1976active, bucklein1981audibility, olive1997detection, schroeder1962natural | The whole entry is from memory: volume, number and pages. |
| preis1982phase | Pages 774–794 and issue 11. The title, author and Nov 1982 are confirmed by the AES E-Library. A second AES record dates it 1981. |
| hjortkjaer2014perceptual | Volume, issue and pages. The authors, venue and year are confirmed by a search snippet. |
| mimilakis2016deep | The convention number (140, Paris). Paper 9539, the authors and 2016 are confirmed. A patent cites it as "JAES", but it is a convention paper. |
| perezgonzalez2008determination | Only a student project page confirmed the title and the 125th AES Convention, so there is no AES E-Library record yet. |
| chourdakis2016automatic | The conference name (AES 60th DREAMS, Leuven). The AES E-Library confirms the title, authors, 2016 and "Paper 9-2". |
| sheng2018feature | The exact title and the convention (AES 144). Only the PDF filename "Feature Selection for Dynamic … 2018" was seen. |
| singh2021intelligent | Volume, issue and pages. The title, authors, JAES and 2021 are confirmed. |
| steinmetz2022style | Volume, issue and pages (I believe 70(9)). JAES 2022 and the authors are confirmed. |
| verfaille2006adaptive, valimaki2012fifty, martinezramirez2020deepa, reiss2018applications, moffat2019approaches | Bibliographic details from memory. These are well-known papers. |
| ma2016intelligent, perezgonzalez2010advanced | Thesis titles from memory. |
| deman2019intelligent | Publisher and year. An O'Reilly listing with ISBN 9781351679022 confirms the book exists. |
| vicanek2016matched, zavalishin2018art, berners2003discrete | The whole entry is from memory. |
| w3c2021web | The editors and the year the W3C Recommendation was published. |
| toole2018sound, katz2015mastering, izhaki2017mixing, vickers2010loudness, pestana2014intelligent, zolzer2002dafx | Edition, year and venue from memory. |

### Not in library.bib (could not confirm)

- **Massberg (2009), MSc thesis on compressor design (QMUL).** The search was not run because the budget ran out. Giannoulis 2012 builds on it.
- **Clifford (2013?), PhD thesis on comb-filter reduction (QMUL).** The title is unknown.
- **Perez Gonzalez & Reiss (2008), "Improved control for selective minimization of masking using inter-channel dependancy effects," DAFx-08.** This is the ducking/unmasking precursor. Not searched.
- **Hafezi & Reiss (2015), JAES 63(5).** This is the method the tool already uses. It was left out on the assumption that the EQ bibliography covers it. The search for it was refused because the budget ran out.
- **Lipshitz, Pocock & Vanderkooy (1980), "Preliminary Results on the Audibility of Midrange Phase Distortion…", AES 67th Convention, paper 1714.** The title and paper number were seen in results. It was left out to avoid near-duplication.
- **Shanefield et al. (1983), Comments and Authors' Reply, JAES 31(6):447–448.** Seen in results but not needed.
- **"TheMasker" (SMC 2024).** This is a masking-aware dynamic EQ with a 32-band filterbank and a sidechain input. It is the only academic spectral-ducking/dynamic-EQ hit, but the authors were not seen. URL: iris.polito.it, SMC2024_paper_id126.pdf.
- **Bromham, Moffat, Barthet & Fazekas (2018), "The impact of compressor ballistics on the perceived style of music," AES 145.** From memory, not searched.
- **Studies on the audibility of linear-phase pre-ringing.** The search was refused (budget). No academic source is pinned down.
- **An academic paper on look-ahead or true-peak limiter design.** The search was refused. The Giannoulis 2012 tutorial, both Zölzer books, Reiss & McPherson, and BS.1770 Annex 2 cover the parts we need.
- **Perceptual studies of EQ amount and Q in mixing**, for example De Man/Reiss on how much EQ engineers apply, or the Reiss/Stables SAFE EQ data. These were not reached. They probably belong in the EQ/semantic bibliography.
- **Moorer (1979), "About this reverberation business," and Jot & Chaigne (1991) on FDN.** Left out, not searched.

## (b) Resolves our open items

### 1. Grounding automatic compression in this tool

- **Compressor core:** giannoulis2012digital. Build it as a feed-forward compressor with a log-domain gain computer, a soft knee and a smooth decoupled or branching peak detector placed after the gain computer. It can be written in an AudioWorklet. The alternative is the native DynamicsCompressorNode, but its detector is unspecified and it cannot take a sidechain.
- **Per-track parameter rules:**
  - giannoulis2013parameter: automatic attack, release, knee and make-up gain, so the user only sets threshold.
  - ma2015intelligent: regression from features to threshold and ratio, based on an experiment with engineers. This is the closest match to the tool's "literature method" style.
  - maddams2012autonomous: cross-adaptive control from loudness and loudness range. It reuses the BS.1770 machinery already in the tool, and LRA is defined in ebu2023tech3342.
- **Choosing features:** sheng2018feature. Threshold and ratio need only standard features. Attack and release need envelope or transient features.
- **Running in the browser:** mason2015adaptive. It is a precedent for compression implemented with the Web Audio API.
- **Mix bus and mastering:**
  - hilsamer2014statistical: offline, target-moment parameter selection, a good fit for an offline render.
  - mimilakis2016deep: a learned alternative.
  - itu2023algorithms Annex 2: the true-peak target for a final limiter.
  - kraght2000aliasing: oversample the gain stage or clipper, or smooth gain changes, to avoid aliasing.
- **Gates for drum stems:** terrell2010automatic and terrell2009automaticnoise. Set the threshold just above the bleed's peak level, and choose attack, hold and release automatically.
- **Perceptual guardrails:** wilson2016perception and hjortkjaer2014perceptual. Always loudness-match before judging compression, and expect quality to drop at high compression and loudness.
- **Multiband compression:** cecchi2023crossover and linkwitz1976active. An all-pass-complementary Linkwitz-Riley split keeps the summed magnitude flat, avoiding a "phasey" crossover dip. Linear-phase splits add latency and pre-ringing.

### 2. Explaining or avoiding "filtered/phasey" EQ

The likely causes are ranked by the evidence:

1. **Comb filtering from summing correlated signals at different delays**, not EQ phase. This happens with bleed between multi-mic stems, parallel paths that have different filter phase, or a filtered copy summed with the dry signal. Fixes:
   - clifford2013using / clifford2011reducing / clifford2010calculating: delay estimation with GCC-PHAT, then alignment.
   - perezgonzalez2008determination: automatic offset correction.
   - Any parallel or multiband path must use complementary filters (cecchi2023crossover).
2. **Too many or too strong narrow peaks.** Resonances are what listeners hear as coloration, and boosts are more audible than cuts.
   - toole1988modification and olive1997detection: detection thresholds for resonances by Q and frequency.
   - bucklein1981audibility: peaks are more audible than dips, and narrow dips are often inaudible.
   - Practical rules: prefer cuts, cap boost gain, and avoid stacking several Q-2 bells in one region.
3. **Bilinear "cramping" near Nyquist.** Cookbook peaks and shelves above about 10 kHz narrow and warp at 44.1/48 kHz, which can make "air" bands sound off. Fixes:
   - orfanidis1997digital: prescribed Nyquist gain.
   - vicanek2016matched: matched biquads.
   - reiss2011design: direct digital design.
   - berners2003discrete: shelves.
   - All of these can be loaded into an IIRFilterNode.
4. **Pure phase or group delay of minimum-phase EQ is rarely the cause.**
   - lipshitz1982audibility: audible mainly with headphones or selected signals.
   - blauert1978group: thresholds in the ms range.
   - deer1985perception: all-pass tests.
   - preis1982phase: theory.
   - A Q-2 peak at a few dB adds group delay far below these thresholds at mid and high frequencies. Large low-frequency boosts and steep high-pass filters are the main exceptions.
   - Linear-phase EQ removes phase shift but adds pre-ringing and latency (smith2007introduction). It is not a free fix.
5. **Time-varying artefacts in future dynamic EQ.** Changing biquad coefficients every block can click or zipper. Use parameter smoothing (AudioParam ramps) or topology-preserving SVFs (zavalishin2018art), or the Regalia-Mitra structure (regalia1987tunable), which has gain decoupled from frequency.

### 3. Web Audio–compatible filter formulas

- **BiquadFilterNode:** the W3C Audio EQ Cookbook (bristowjohnson2021audio) gives the exact formulas the node uses for peaking, low/high shelf and low/high pass with Q. The Web Audio spec (w3c2021web) refers to it, though I have not confirmed the spec's exact wording.
- **IIRFilterNode with custom coefficients:**
  - orfanidis1997digital
  - reiss2011design
  - vicanek2016matched
  - orfanidis2005high (cascades of high-order sections)
  - ma2013implementation (fitted Yule-Walker target EQ)
- **AudioWorklet:**
  - Compressor: giannoulis2012digital.
  - Gate: terrell2010automatic.
  - True-peak meter: itu2023algorithms (4x oversampling plus FIR interpolation).
  - Linkwitz-Riley multiband split: cecchi2023crossover.
  - SVF dynamic EQ: zavalishin2018art.
- **Reverb:** the ConvolverNode, or an FDN in an AudioWorklet (valimaki2012fifty, schroeder1962natural).
- **Reference books:**
  - valimaki2016all (open access, with code)
  - zolzer2008digital (equalizer and dynamics chapters)
  - reiss2014audio
  - smith2007introduction (free online)

## (c) Notable facts found, with sources

- **Giannoulis, Massberg & Reiss 2012** (AES E-Library 16354) recommend feed-forward designs for stability and predictability, with the level detector in the log domain after the gain computer. They compare RMS and peak detection, feed-forward and feedback, and linear- and log-domain detection.
- **Giannoulis et al. 2013** (AES 16965): after automation, the user only needs to set the threshold for the amount of compression wanted.
- **Ma et al. 2015** (JAES 63(6):412–426, doi 10.17743/jaes.2015.0053): ran a listening experiment on how engineers set ratio and threshold, then fitted multiple linear regression from features. The automatic mixes competed with or beat semi-professional mixes.
- **Maddams, Finn & Reiss 2012:** used loudness and loudness range as cross-adaptive control features in 6 operating modes. The output was roughly equal to an expert engineer's mix.
- **Hilsamer & Herzog 2014:** changed the side-chain ballistics so a statistical model applies. Parameters are chosen so the output's central moments match (genre) targets. Pages 35–40 (DBLP).
- **Mimilakis et al. 2016:** a DNN predicts critical-band gain coefficients. Listening tests with producers and mastering engineers found results on average equivalent to professional masters, and better than some commercial software.
- **Sheng & Fazekas 2018:** time and frequency features are enough for threshold and ratio, but attack and release need more specialised features.
- **Mason et al. 2015:** compression controlled by the listener and by ambient noise from the phone microphone, built on the HTML5 Web Audio API.
- **Terrell, Reiss & Sandler 2010** (doi 10.1155/2010/465417): attack, release, threshold and hold are set automatically, and gain is left to the user. The method was tested on kick drums with bleed from hi-hat, snare, cymbals and toms. In the DAFx-09 version, the optimal threshold is slightly above the peak level of the noise (bleed).
- **Clifford & Reiss 2013** (JAES 61(11):917–927): summing mics at different distances creates a comb filter with a flanging effect, which may be the "phasey" sound. They analyse GCC-PHAT accuracy on arbitrary music. Clifford & Reiss 2010 (AES 129, paper 8157): the method handles several simultaneously active sources and also estimates source positions.
- **De Man, McNally & Reiss 2017** (JAES 65(1/2):108–116, doi 10.17743/jaes.2016.0062): perceived reverb amount is predicted by relative reverb loudness and early decay time from an "equivalent impulse response." 80 mixes of 10 songs were rated by trained engineers. There is no single preferred amount, but bounds can be identified, and too much reverb lowers preference.
- **Chourdakis & Reiss 2017** (JAES 65(1/2):56–65, doi 10.17743/jaes.2016.0069): classifiers trained on user examples from the Open Multitrack Testbed, evaluated with F1, MSE and listening tests.
- **Benito & Reiss 2017:** best practices for reverb are encoded as Probabilistic Soft Logic rules whose weights reflect how well each is supported. Audio examples and templates are at code.soundsoftware.ac.uk/projects/multitrackreverb.
- **Pestana & Reiss 2014:** time-frequency bins are mapped to azimuth to reduce masking. The paper suggests the method suits live use and creative sound design.
- **Mimilakis et al. 2013** (AES 134, paper 8836): mastering EQ driven by fundamental-frequency tracking, evaluated with PEAQ and listening tests.
- **Orfanidis 1997** (JAES 45(6):444–455): the digital filter's gain at Nyquist is set to the analog prototype's gain, not 0 dB. MATLAB peq.m exists. **Orfanidis 2005** (JAES 53(11):1026–1046): Butterworth, Chebyshev and elliptic high-order parametric EQs, which also cover shelving, bandpass and bandstop.
- **W3C Audio EQ Cookbook:** a W3C Working Group Note dated 8 June 2021, adapted from Bristow-Johnson's text. It uses the bilinear transform with prewarping and bandwidth correction, normalises a0 = 1, and gives Direct Form 1 as the most straightforward implementation.
- **Reiss 2011** (IEEE TASLP 19(6):1843–1848, doi 10.1109/TASL.2010.2091634): pole-zero placement treated quantitatively, giving simple design equations without a bilinear transform.
- **Välimäki & Reiss 2016** (Applied Sciences 6(5):129, doi 10.3390/app6050129): open access, with code at code.soundsoftware.ac.uk/projects/allaboutaudioeq.
- **Cecchi et al. 2023** (JAES 71(9):526–551, doi 10.17743/jaes.2022.0100): recommends an all-pass-based Linkwitz-Riley network when an efficient minimum-phase crossover is needed. Linear-phase crossovers add throughput delay.
- **Multiband band-edge artefact** (patent US8903109): band edges in multiband compression can produce a response bump of about 3 dB, up to 6 dB depending on ratio, even with in-phase Linkwitz-Riley outputs.
- **Blauert & Laws 1978** (JASA 63(5):1478–1483): group-delay thresholds as reported second-hand are about 3.2 ms at 500 Hz, 2 ms at 1 kHz, 1 ms at 2 kHz, 1.5 ms at 4 kHz and 2 ms at 8 kHz. They were measured over electrostatic headphones and were most detectable with impulsive sounds. Check against the original.
- **Lipshitz, Pocock & Vanderkooy 1982** (JAES 30(9):580–595): of the links in the audio chain, only the loudspeaker adds significant midrange phase nonlinearity. Small phase errors are audible on chosen signals, far more easily over headphones, and generally not on music or speech, except for some vocal material.
- **Toole & Olive 1988** (JAES 36(3):122–142): resonances change perceived timbre, and the paper relates measured amplitude and time responses to perception. My recollection, not confirmed in snippets, is that low-Q resonances are audible at lower amplitudes than high-Q ones with broadband signals.
- **BS.1770-5** (11/2023): Annex 2 contains the true-peak guidelines. Secondary sources describe the reference chain as 4x oversampling, low-pass, abs and dB. A Fora Soft article attributes to the standard a 4x under-read of up to about 0.69 dB near fs/2; this is secondary and unverified.
- **EBU Tech 3342** (v4, Nov 2023, content identical to v3): in v2 the relative gate changed from −8 to −10 LU. LRA should be used as a mixing guide, not a hard delivery limit. Meters must show that LRA is not stable during the first 60 s (2016 EBU news).
- **Wilson & Fazenda 2016** (JAES 64(1/2):23–34, doi 10.17743/jaes.2015.0090): quality tracks loudness and compression-related features, liking is driven by familiarity, and listener expertise has little effect.
- **Steinmetz & Reiss 2022:** models an LA-2A in real time on CPU from about 10 minutes of training data. **Steinmetz, Bryan & Reiss 2022:** backpropagation through differentiable EQ and compressor to predict their settings from a style reference.
- **Commercial spectral-ducking and dynamic-EQ tools** (Sound on Sound review and others): sonible pure:unmask, FabFilter Pro-Q/Pro-MB sidechain, Wavesfactory Trackspacer, Melda MAutoDynamicEq. There is little academic literature beyond Hafezi & Reiss, Perez Gonzalez & Reiss, and TheMasker (SMC 2024).
