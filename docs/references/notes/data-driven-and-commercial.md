# E: Data-driven / deep-learning mixing, commercial and patent landscape: notes

Companion to `E-datadriven-commercial.bib` (71 entries: 24 `verified = {yes}`, 47 `verified = {partial}`).

**Search caveat.** The shared WebSearch budget for this turn (200 calls across all agents) ran out after 24 of this agent's searches. Everything marked `partial` in library.bib, and every row in the product table below marked "(memory)", comes from prior knowledge and was not re-checked in this session. Please spot-check before citing. Facts that search results did confirm are marked "(confirmed)" with their source.

---

## (a) Items not pinned down

| Item requested | Status |
|---|---|
| **Kuroyanagi et al.** (automatic mixing) | Two searches found nothing under this name, including Sony's CreativeAI listing. Possibly confused with another Sony/Japanese author. A Kwansei Gakuin single-author paper (Okita 2026, arXiv 2604.22276) was found and included instead. |
| **"Mixing Transformer"** | No paper by this exact name was found. The transformer-controller mixer that does exist is Diff-MST (Vanka et al. 2024), which is included. |
| **"MixWaveUNet"** | This is the code release `github.com/f90/Mix-Wave-U-Net` (confirmed) for Martínez Ramírez, Stoller & Moffat, JAES 2021. It is cited in that entry's annote and has no separate entry. |
| **Automatic mixing challenge 2025/2026** | One extended search found no ICASSP, ISMIR or DCASE automatic-*mixing* challenge. The only 2025 challenge it surfaced was music *transcription*. The demixing challenges are included: MDX 2021 (Mitsufuji et al. 2022) and SDX 2023 (Fabbro et al. 2024), both partial, with SDX given only as "Fabbro and others". |
| **Martínez-Ramírez "2023 style transfer"** | This is Koo, Martínez-Ramírez et al., ICASSP 2023 (included, confirmed). |
| **Mimilakis 2016 author list** | The jazz paper's authors are Mimilakis, Cano, Abeßer and Schuller (confirmed). Drossos and Virtanen co-authored a different 2016 paper, the AES 140 DNN mastering-compression paper (included, partial). |
| **Steinmetz MSc thesis** | "Learning to mix with neural audio effects in the waveform domain" (UPF, 2020). From memory; not included. |
| **StemFX** (arXiv 2607.15634), "Learning mixing style representations via autoregressive FX chain prediction on source-separated stems" | Title and arXiv ID were seen in search results; authors unknown. Not included. |
| **WildFX** (arXiv 2507.10534), "A DAW-powered pipeline for in-the-wild audio FX graph modeling" | Title and arXiv ID seen; authors unknown. Not included. |
| **NablAFx** (Comunità, Steinmetz, Reiss 2025), differentiable black-/gray-box modelling framework | From memory; not included. |
| **2023–2026 surveys of AI in music production** | No dedicated survey was confirmed. The closest items are included: the ISMIR 2022 tutorial, Moffat & Sandler 2019, De Man et al. 2017, Hayes et al. 2024 (DDSP review) and the 2026 two-stage analysis. **Not included:** Stables, Reiss & De Man, *Intelligent Music Production* (Focal Press, 2019), assumed to be covered by another topic file. |
| US 2007/0044643 A1, "Method and apparatus for automating the mixing of multi-track digital audio" | Seen in results (Justia). Inventor and assignee not confirmed; not included. |
| DOIs left out on purpose | ICASSP DOIs for Koo 2022/2023, DeepAFx 2021 and the Steinmetz JAES 2022 DOI could not be confirmed, so they were omitted rather than guessed. The Steinmetz ICASSP 2021 DOI comes from the IEEE document number 9414364, which was confirmed. |

---

## (b) Commercial products (not in .bib)

The search budget ran out before the product searches. Only the cells marked (confirmed) were checked in this session; the rest are from memory and need checking.

| Product | Developer | Introduced | What it does | Published technical basis |
|---|---|---|---|---|
| **Neutron**: Track Assistant, Masking Meter, Mix Assistant, Unmask, Visual Mixer | iZotope (Cambridge MA; merged with Native Instruments under Soundwide, 2021–22) | Neutron 1 2016 with Track Assistant and the EQ Masking Meter; Neutron 2 2017 with Visual Mixer and Tonal Balance Control; Neutron 3 2019 with Mix Assistant; Unmask module in Neutron 4 (2022) (memory). Neutron 5 is current (confirmed). | ML instrument recognition, then genre-target presets for EQ, compression and level. Mix Assistant sets relative levels. Unmask "combines iZotope's Masking technology with spectral shaping" to auto-demask one track against a sidechain (confirmed, izotope.com). The Masking Meter shows bands where one track masks another. | **Patents** US 10,396,744, 10,763,812, 10,972,065 and 11,469,731, "Identifying and remediating sound masking", with masking modelled as loudness loss per band (confirmed, see .bib). No peer-reviewed paper. |
| **Nectar 3/4**: Vocal Assistant, Unmask | iZotope | Nectar 3 2019 (memory) | Vocal chain assistant. Unmask carves the backing track to make room for vocals (confirmed, izotope.com "How to Unmask Vocals with Nectar 3 Plus"). | Same masking patent family (inferred). |
| **Ozone**: Master Assistant | iZotope | Ozone 8, 2017 (memory) | Reference- and genre-target mastering chain. | No paper; ML genre targets. |
| **smart:EQ 4** (earlier smart:EQ+, smart:EQ 3) | sonible GmbH (Graz, Austria) | smart:EQ+ about 2017; smart:EQ 3 about 2020 (memory); smart:EQ 4 current (confirmed); smart:EQ+ discontinued (confirmed). | AI tonal-balance EQ from genre/instrument profiles. smart:EQ 3 added group "cross-channel processing to reduce spectral masking". smart:EQ 4 "corrects spectral issues and achieves tonal balance" and supports spectral unmasking across channels (confirmed, sonible.com). | No patent found (one search, Sonible not found as assignee). No peer-reviewed paper. Sonible has collaborated with academia, e.g. the Graz and Vienna universities (memory). |
| **smart:comp 2 / smart:limit / smart:reverb** | sonible | smart:comp about 2018, smart:limit about 2020, smart:comp 2 2022 (memory) | Learned profile-based compression and limiting with loudness targets. | None published. |
| **pure:unmask** | sonible | about 2023–24 (memory) | One-knob sidechain spectral unmasking of a target against the rest of the mix. | None published. |
| **soothe2** (soothe 2016) | oeksound (Helsinki, Finland) | soothe 2016; soothe2 2020 (memory) | Dynamic resonance suppressor that detects narrow resonant peaks relative to a smoothed spectrum and attenuates them. soothe2 adds an external sidechain, so it can act as a dynamic spectral ducker. | No patent or paper found (not searched; budget ran out). |
| **TheMasker** | **Developer not confirmed** | about 2021–22 (memory) | Marketed as dynamic EQ driven by a psychoacoustic masking threshold of the sidechain: it reduces only the bands of the main signal that are above the sidechain's masking threshold. | Claims a psychoacoustic masking-threshold model; developer and any paper could not be verified. **Action item.** |
| **Trackspacer** (2.0/2.5) | Wavesfactory (Spain) | about 2015–16; 2.5 about 2019 (memory) | 32-band sidechain spectral ducking: the sidechain's spectrum is inverted and applied as EQ to the target. A simple real-time form of dynamic unmasking. | None published. |
| **MIXROOM / REFERENCE / LEVELS / BASSROOM** | Mastering The Mix (UK) | MIXROOM about 2019 (memory) | Target-curve EQ suggestions by genre and reference, loudness and level checks. | None published. |
| **Automix** (also mastering products such as Tonn) | RoEx Audio (London; QMUL-linked) | about 2023 (memory); now handles up to 32 tracks (confirmed, July 2025 roexaudio.com blog) | Cloud/API automatic multitrack mixing and mastering for musicians. | RoEx people have QMUL automatic-mixing ties (memory). Patent search did not run. |
| **LANDR** | LANDR Audio (Montréal; formerly MixGenius) | launched 2014 (memory) | Automated mastering, plus distribution and samples. | Patents US 9,654,869 (with QMUL) and US 2015/0066481 (confirmed in search). Sterne & Razlogova 2019 (in .bib). |
| **F6 Floating-Band Dynamic EQ** | Waves Audio | about 2016 (memory) | 6-band dynamic EQ with an external sidechain, used for manual sidechain unmasking. | None published. |
| **Curves Equator** | Waves | about 2022 (memory) | Automatic resonance suppression (a soothe competitor). | None published. |
| **Clarity Vx / Vx Pro** | Waves | about 2022 (memory) | Neural vocal noise removal, not mixing (included to clarify the "Clarity" query). | Neural network; no paper. |
| **Pro-Q 3 / Pro-Q 4** | FabFilter (Amsterdam) | Pro-Q 3 2018, Pro-Q 4 2024 (memory) | Dynamic EQ bands. Pro-Q 3 can display spectra from other instances and highlight "collisions" (manual masking detection). Pro-Q 4 adds spectral dynamics. | None published. |
| **Gullfoss** | Soundtheory (Iceland) | 2018 (memory) | Automatic real-time EQ based on a "computational auditory perception" model (recover/tame/brighten). Closest commercial cousin of a loudness-model EQ. | Vendor describes an auditory-perception model; no paper. |
| **Smooth Operator** | Baby Audio | about 2020 (memory) | Spectral balancer with sidechain ducking mode. | None. |
| **Mastering Assistant** (Logic Pro) | Apple | 2023 (memory) | Automatic mastering inside the DAW. | None. |
| **Dolby.io Music Mastering** (API) | Dolby | about 2021 (memory) | Cloud mastering API. | Related research: Steinmetz et al. ICASSP 2021 and patent US 12,456,493 (Dolby). |
| **Auphonic Multitrack** | Auphonic (Graz) | about 2013 (memory; a Gearspace thread was confirmed in results) | Automatic levelling, ducking and loudness for spoken-word multitrack. | None peer-reviewed. |
| **Other 2024–26 AI mix assistants** (memory, unverified) | Masterchannel, eMastered, CloudBounce, BandLab Mastering, Cryo Mix, Mixea, Neutron 5 Mix Assistant, sonible prime:vocal, RoEx Tonn | — | Mostly cloud mastering or vocal chains. Few true multitrack mixers (RoEx Automix, Cryo Mix). | None published. |

**Positioning.** Every commercial demasker is either a manual or semi-automatic sidechain tool (Trackspacer, soothe2 sidechain, F6, Pro-Q collisions, pure:unmask) or a proprietary ML assistant (Neutron, smart:EQ 4). None publishes its algorithm except iZotope, through patents. A tool that implements published, peer-reviewed algorithms (BS.1770 plus Hafezi & Reiss 2015 plus De Man & Reiss 2013) with visible parameters is distinctive. **Freedom-to-operate flag:** the iZotope masking family (priority 2017) models masking as loudness loss per band, which is conceptually close to Hafezi & Reiss's masking measure. Have counsel compare the project's per-band masking metric against the iZotope claims. Hafezi & Reiss 2015 predates the iZotope priority date, which helps the prior-art position.

---

## (c) Patents found but not fully confirmed

- **US 10,396,744 / US 10,763,812 / US 11,469,731 (iZotope).** The family chain is confirmed from the US 10,972,065 related-applications text and Justia. Exact inventor lists for each member are assumed to match US 10,972,065, and the grant year of 10,396,744 is from memory.
- **US 9,654,869 B2 (LANDR Audio / QMUL).** Title, assignees and grant are confirmed. Full inventor list and order are not; assignment records named Reiss, Mansbridge and Clifford. WO 2015/035492 A1 ("automatic multi-track audio mixing", MixGenius) is a related family member.
- **US 2015/0066481 A1 (MixGenius → LANDR).** Grant status and inventor first names are unconfirmed (assignors Terrell, Mansbridge, Reiss).
- **US 11,132,984 B2 (DTS).** Divisional of US 9,640,163. Grant year not confirmed.
- **US 2007/0044643 A1**, "Method and apparatus for automating the mixing of multi-track digital audio". Inventor and assignee unknown.
- **Not searched (budget exhausted):** Sonible (one search found nothing), RoEx, oeksound, Wavesfactory, Soundtheory, FabFilter, and Dolby dialogue/music-mixing patents beyond US 12,456,493. Queen Mary also has older patent filings tied to automatic mixing (e.g. cross-adaptive work by Perez-Gonzalez & Reiss) that were not checked. **Recommended follow-up:** Google Patents assignee queries for "sonible", "RoEx", "oeksound", "Soundtheory", plus "dynamic equalization sidechain masking threshold".

---

## (d) Data-driven methods for a browser or for interpretable EQ/compression (future AI layer)

**Interpretable parameter outputs.** These produce settings in the project's own vocabulary, so an AI layer could be run in the browser with the existing DSP:
- **Steinmetz et al. 2021 differentiable console** and **Diff-MST (Vanka et al. 2024).** Output per-track gain, pan, parametric EQ and compressor settings, plus a master bus. Their order-invariant, any-number-of-tracks design suits arbitrary stems. Inference would need ONNX Runtime Web or TF.js. The models are smallish, but the encoders process spectrograms of every stem. Licence: Diff-MST code is CC-BY-NC-SA (confirmed). The Steinmetz console is patented by Dolby (US 12,456,493).
- **DeepAFx-ST (Steinmetz, Bryan & Reiss 2022).** Predicts parametric EQ and compressor parameters from a reference with self-supervised training. A natural "match this reference" layer on top of the clean base mix. The parameters map directly to Web Audio `BiquadFilterNode` and `DynamicsCompressorNode` (approximately).
- **Nercessian 2020 (neural parametric EQ matching), Kuznetsov et al. 2020, Yu et al. 2024 (differentiable IIR / all-pole).** Output biquad coefficients or parameters, so the result runs as plain biquads. Cheap enough for the browser.
- **Colonel & Reiss 2021 (reverse engineering a mix).** An optimisation, not a network. It could run client-side, with WebGPU or plain JS gradient descent on small parameter sets, to explain a reference mix in gain/EQ/compression terms.
- **Inference-time optimisation:** ST-ITO (2024), ITO-Master (2025), the Gaussian-prior vocal ITO (2025), Text2FX (2025). These search effect parameters against an embedding (CLAP or an FX encoder), so the existing non-differentiable browser DSP can be driven. The cost is running the embedding model repeatedly, which is heavy in the browser and better done server-side or with a WebGPU CLAP.
- **LLM2Fx (Doh et al. 2025).** Text to EQ/reverb parameters via an LLM, zero-shot. The most direct fit for a "downstream AI tools" layer: an LLM receives the base-mix parameters as JSON and proposes edits.
- **Sheng & Fazekas 2019 / Singh et al. 2021.** Compressor settings predicted from example audio. Small siamese networks, so browser-feasible.
- **Lee et al. 2024 pruned mixing graphs.** Show that most tracks need only a few processors, which argues for keeping the base mix minimal.

**Black-box or heavy, so poor fit for an interpretable browser layer:** the Wave-U-Net drum mixer (2021), FxNorm and Mix-Wave-U-Net (2022), MEGAMI diffusion (2026), the Koo 2022 remastering and 2023 MixFXcloner, and Fx-Encoder++ (useful as an evaluation metric, not a controller). These output audio or latent embeddings, not settings.

**Real-time neural effects:** micro-TCN (Steinmetz & Reiss 2022) and the Wright et al. 2019 RNNs run on CPU in real time and could be ported to WebAssembly/AudioWorklet. They are not needed for the base mix.

**Evaluation support:** auraloss (multi-resolution STFT distance), FXencoder and Fx-Encoder++ embeddings, and pyloudnorm can serve as objective "distance to reference" metrics for A/B testing the base mix against learned systems.

---

## (e) Notable facts with sources

- FxNorm (Martínez-Ramírez et al., ISMIR 2022) normalises wet stems by average effect-related features from a source-separation dataset, applies the same preprocessing at inference, and redesigns the mixing listening test. ISMIR 2022 pages 411–418 (DBLP). Sources: https://arxiv.org/abs/2208.11428, https://ismir2022program.ismir.net/poster_11.html
- The Steinmetz et al. ICASSP 2021 console is order-invariant, has no fixed track cap and produces human-readable parameters. Authors are from Dolby and UPF. https://arxiv.org/abs/2010.10291, https://ieeexplore.ieee.org/document/9414364
- Dolby patent **US 12,456,493 B2**, "System for automated multitrack mixing": inventors Steinmetz and Serrà; provisional filed 15 Oct 2020; granted 28 Oct 2025; 21 claims; controller trained on top of a pre-trained transformation network. https://patentsgazette.uspto.gov/week43/OG/html/1539-4/US12456493-20251028.html
- Diff-MST predicts gain, pan, 4-band EQ, compression and master bus from raw tracks plus a reference. Code is CC-BY-NC-SA 4.0. https://arxiv.org/abs/2407.08889
- Wave-U-Net drum mixes were reported as "virtually indistinguishable" from professional mixes (JAES 69(3):142–151, doi 10.17743/jaes.2020.0031). https://pearl.plymouth.ac.uk/handle/10026.1/16380
- MEGAMI (Moliner et al., ICASSP 2026) reframes automatic mixing as generative, modelling a distribution of valid mixes via conditional diffusion over effect embeddings. https://arxiv.org/abs/2511.08040
- Shi et al. 2026 (arXiv 2609.02835): two-stage systems (intra-group then inter-group) significantly beat single-stage baselines. Grouping errors hurt noticeably, while loudness changes have weaker, model-dependent effects. https://arxiv.org/abs/2609.02835
- The Vanka et al. 2023 adoption study identifies three user groups. Amateurs accept AI results; pro-ams want control; professionals want control plus assistive and collaborative features. https://arxiv.org/abs/2304.03407
- iZotope masking patents define masking as loudness loss in a stem caused by other stems in a frequency range. Family priority 7 Jun 2017. US 10,972,065 inventors: McClellan, Wichern, Robertson, Wishnick, Lukin, Hines, LaPenn. https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10972065, https://patents.justia.com/assignee/izotope-inc
- iZotope describes Unmask as combining its Masking technology with spectral shaping. https://www.izotope.com/en/learn/unmasking-your-mix-with-neutron.html
- Sonible smart:EQ 3 introduced group "cross-channel processing to reduce spectral masking"; smart:EQ 4 continues it; smart:EQ+ is discontinued. https://www.sonible.com/smarteq4/, https://www.sonible.com/blog/introducing-smart-eq-plus/
- LANDR/MixGenius and Queen Mary jointly filed US 2015/0117685 (granted as US 9,654,869), which also covers automatic mastering after multitrack processing. https://patents.google.com/patent/US20150117685A1/en
- Sterne & Razlogova (2019) found no evidence of patent filings for an *entirely* AI-based approach to mastering. https://journals.sagepub.com/doi/10.1177/2056305119847525
- DTS US 9,640,163 (automatic multichannel mix from stems; priority 2013) is listed by Google Patents as Expired – Fee Related. https://patents.google.com/patent/US9640163
- RoEx Automix was announced as handling 32 tracks in July 2025. https://www.roexaudio.com/blog/ai-mixing-just-got-an-upgrade-automix-now-handles-32-tracks
- micro-TCN models an LA-2A in real time on CPU from 10 minutes of training data. https://arxiv.org/abs/2102.06200
- The ISMIR 2022 tutorial "Deep learning for automatic mixing" (Steinmetz, Vanka, Bromham, Martínez Ramírez) is hosted at https://dl4am.github.io/tutorial (not opened).
