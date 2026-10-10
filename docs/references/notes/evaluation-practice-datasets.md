# D: Evaluation, mixing practice, semantic audio, datasets, tools (notes)

Companion to `D-evaluation-practice.bib` (98 entries: 42 `verified = {yes}`, 56 `verified = {partial}`).

**Search caveat.** About 45 web searches ran before the shared search budget for this turn ran out (the "limit: 200 per turn" applies across all agents). The entries confirmed by search are all in sections 1–7 of library.bib, above the `PARTIAL FROM HERE` marker. Everything below that marker was written from memory and is flagged `partial`. No DOI was written unless a search result showed it. The licences, sizes and URLs in sections (b) and (c) below also come from memory unless marked [S], which means a search result confirmed it. Check them before you publish.

---

## (a) Items not pinned down

| Item | What is uncertain | Where it is |
|---|---|---|
| ITU-R BS.1534 revision history | Search confirmed only BS.1534-3 (10/2015). The dates for BS.1534 (2001), -1 (01/2003, title "...coding systems") and -2 (06/2014) are from memory. | `itu2015method`; `itu2003method` (partial) |
| BS.1534-3 anchor and post-screening rules | From memory: the 3.5 kHz low-pass anchor is mandatory and the 7 kHz mid anchor is recommended. Post-screening excludes an assessor who rates the hidden reference below 90 on more than 15 % of items. Check against the PDF. | notes (d) |
| Bech & Zacharov 2006 DOI | Search showed the ISBN 978-0-470-86923-9 but no DOI. 10.1002/9780470869253 is a plausible DOI but unconfirmed, so it was left out. | `bech2006perceptual` |
| Deruty et al. 2014, Vanka et al. 2024 (JAES) DOIs | Vol/issue/pages confirmed; no DOI seen in results. | .bib |
| Mix Evaluation Dataset (DAFx-17) pages | Not seen. | `deman2017mix` |
| Bromham 2017 chapter | Chapter 16, starting p. 245, is confirmed. The end page and the 2017 year are from memory. | `bromham2017how` |
| Toulson 2008 | Search confirmed JARP Issue 3, Nov 2008, single author. No URL was captured (arpjournal.com hosts the archive). | `toulson2008can` |
| Sabin, Rafii & Pardo 2011 JAES | The title and JAES 2011 are confirmed by the author PDF URL. Vol. 59(6) pp. 419–430 is from memory. | `sabin2011weighting` |
| Stasis, Stables & Hockman 2DEQ | Applied Sciences 2016, 6(4):116 is from memory. An earlier DAFx/AES 2DEQ paper probably exists but was not confirmed, so it is not in library.bib. Stasis's BCU PhD thesis "Audio Equalisation Using Natural Language" exists (open-access.bcu.ac.uk/8847); its year was not confirmed. | `stasis2016semantically` |
| Reed 2000 IUI | From memory (pp. 212–218). | `reed2000perceptual` |
| Jillings & Stables 2017 (semantic DAW; masking via evolutionary computing) | Both are from memory. Venue for the DAW paper: AES Semantic Audio Conference, Erlangen 2017 (possibly WAC 2017 instead). | .bib |
| Vickers 2011 JAES | The May 2011 JAES issue is confirmed [S]. Vol. 59(5) is from memory and the pages are unknown. | `vickers2011loudness` |
| "Louder sounds better" literature | Illényi & Korpássy 1981 (Acustica 49) and Hjortkjær & Walther-Hansen 2014 are from memory. Others worth finding: Wendl & Lee (AES 2014) on loudness and compression preference; Taylor & Martens (AES 136, 2014) on hyper-compression preference; Croghan, Arehart & Kates (Ear & Hearing 2014). None was confirmed. | .bib / here |
| MixAssist (2025) | Search confirmed arXiv 2507.06329, "MixAssist: An Audio-Language Dataset for Co-Creative AI Assistance in Music Mixing". Authors not captured (likely Clemens et al.; companion repo github.com/mclemcrew/MixologyDB). | not in .bib |
| MixParams | Mentioned in the MixAssist paper [S] as an extension of the Mix Evaluation Dataset with DAW-derived parameter settings. Citation not found. | here |
| Pras & Guastavino, other work | Only the 2011 Musicae Scientiae paper was confirmed. `pras2010sampling` and `pras2013record` are from memory. Pras, Guastavino & Lavoie (Psychology of Music 2013) on producers' comments and musicians' self-evaluation is a candidate but unconfirmed. | .bib |
| Owsinski | The 5th edition (2022) is confirmed. A 6th edition (2025) is listed on Apple Books [S] and was not added. | `owsinski2022mixing` |
| MoSQITo | No peer-reviewed paper confirmed. A conference paper (Internoise ~2021/2022) may exist. Cite the repo for now. | (c) |
| automix-toolkit / dl4am tutorial URL | The tutorial site URL `dl4am.github.io/tutorial` is from memory. | `steinmetz2022deep` |
| Web Audio API editors/date | From memory: W3C Recommendation 17 June 2021, editors Paul Adenot and Hongchan Choi. A Web Audio API 1.1 draft is ongoing. | `w3c2021web` |
| Hafezi & Reiss 2015 | The core EQ method belongs in the EQ/masking topic file, not here (JAES 63(5), 2015, from memory). | — |

---

## (b) Datasets

The licence, size and URL details below are from memory unless marked [S]. "Stems+mix" means the stems come with a reference mix.

| Dataset | URL | Size / content | Licence | Stems+mix? | Notes |
|---|---|---|---|---|---|
| **Mix Evaluation Dataset** (De Man & Reiss 2017) | Via Brecht De Man's site / "Mix Evaluation Browser" (C4DM news 2017 [S]) | 180 mixes (≈18 songs × ≈10 mixes), parameter settings, ≈5000 ratings, free-text comments [S] | Raw tracks from Cambridge-MT / Open Multitrack Testbed with their own terms | **Yes: several human mixes per song plus ratings** | **Best for validating our tool.** Insert our automatic mix as an extra condition and compare it with mixes that already carry ratings. |
| **MedleyDB 1.0 / 2.0** (Bittner 2014/2016) | medleydb.weebly.com; Zenodo (access by request) | 122 (v1) + 74 (v2) = 196 songs; raw tracks, stems, final mix, instrument labels, stem-to-mix activation | CC BY-NC-SA 4.0 | **Yes: professional mix**, plus labelled instrument roles | **Best open source of ground-truth role offsets.** Measure each stem's loudness against the original mix. Covers many genres. |
| **MUSDB18 / MUSDB18-HQ** (Rafii et al. 2017/2019) | sigsep.github.io/datasets/musdb.html; Zenodo | 150 tracks (100 train / 50 test), ≈10 h; stems: vocals, drums, bass, other; HQ = uncompressed WAV | Academic, non-commercial (per-track terms) | Mixture = linear sum of the engineer-balanced stems | The stems keep the commercial balance, so stem loudness minus mixture loudness gives a 4-role offset distribution across 150 songs. Usable as a "recover the balance" test: normalise the stems, run our tool, compare. Zenodo DOIs from memory (check): 10.5281/zenodo.1117372 (MUSDB18), 10.5281/zenodo.3338373 (HQ). |
| **DSD100** (SiSEC 2016) | sigsep.github.io | 100 tracks (from Mixing Secrets), 4 stems + mixture | Research use | Same as MUSDB18 (MUSDB18 includes it) | Superseded by MUSDB18. |
| **Cambridge Music Technology "Mixing Secrets" multitrack library** | cambridge-mt.com/ms/mtk | 500+ multitracks across genres; forum hosts thousands of user mixes (source of Wilson & Fazenda's 1501 mixes [S]) | Free download for education/personal use; no redistribution | Raw tracks; many have a preview/"original" mix plus forum mixes | Good for broad coverage and multiple human mixes. The licence blocks redistribution of derived audio. |
| **Open Multitrack Testbed** (De Man et al. 2014) | multitrack.eecs.qmul.ac.uk (availability uncertain in 2026) | Hundreds of multitracks with metadata and linked mixes | Mixed (CC licences per item) | Some | Partly folded into the Mix Evaluation Dataset. |
| **Slakh2100** (Manilow et al. 2019) | slakh.com; Zenodo | 2100 tracks, ≈145 h, MIDI-rendered stems | CC BY 4.0 | Mixture = sum of rendered stems (no human balance) | Only for stress tests (many stems, masking). Not valid for balance targets. |
| **ENST-Drums** (Gillet & Richard 2006) | Télécom Paris (request) | 3 drummers, 8 mics, ≈225 min; dry/wet drum mixes plus accompaniment | Research licence | Drum stems + engineer drum mix | Used by automix-toolkit. Validates the drum-subgroup balance. |
| **IDMT-SMT-Drums / -Guitar / -Bass** (Fraunhofer IDMT) | idmt.fraunhofer.de; Zenodo | Isolated-instrument recordings and annotations | CC BY-NC-ND (typical) | No | Not useful for mix validation. Possibly useful for EQ unit tests. |
| **MoisesDB** (Pereira et al. 2023) | github.com/moises-ai/moises-db | 240 tracks, hierarchical stems (11 top-level) | Non-commercial | Stems + mixture (sum) | Finer roles (e.g. guitar, piano, vocals split) for per-role offsets. |
| **musdb-XL** (Jeon et al. 2023) | Zenodo | MUSDB18 test set mastered loud (limiter) | Non-commercial | Yes (loud masters) | Use only if we test mastering/loudness. |
| **MixAssist / MixologyDB** (2025) | arXiv 2507.06329; github.com/mclemcrew/MixologyDB [S] | Audio-language mixing dialogues | Check repo | Partial | Semantic feedback on mixes. Useful for a future "explain the mix" feature. |
| **SAFE dataset** | semanticaudio.co.uk (SAFE plugins) | Descriptor + EQ/compressor/reverb/distortion settings | Open (check) | No | Supplies word-to-EQ curves. |
| **SocialEQ data** | Downloadable per the ISMIR 2013 paper [S] | 324 words, 731 sessions, 40-band curves [S] | Check | No | Supplies word-to-EQ curves. |
| URMP, Bach10, GuitarSet | — | Classical/chamber/guitar multitracks | Various | Some | Low priority. |

**Recommended validation stack:**
1. Mix Evaluation Dataset for the perceptual comparison with rated human mixes.
2. MedleyDB for objective role-offset and spectral error against the professional mix.
3. MUSDB18-HQ for large-N four-role balance statistics and a "recover the balance" test.
4. Cambridge-MT for genre breadth and multiple human mixes, used internally only because of the licence.

---

## (c) Repositories and tools

Licences are from memory. Check each LICENSE file before reusing code.

| Tool | URL | Language | Licence | What we could reuse in a browser |
|---|---|---|---|---|
| **pyloudnorm** | github.com/csteinmetz1/pyloudnorm | Python | MIT | Reference BS.1770-4 integrated loudness. Port its K-weighting coefficients and gating, and use it as a test oracle for our JS meter. |
| **libebur128** | github.com/jiixyj/libebur128 | C | MIT | EBU R128 / BS.1770 (momentary, short-term, integrated, LRA, true-peak). Can be compiled to WASM with Emscripten. Test vectors. |
| **MoSQITo** (Green Forge Coop) | github.com/Eomys/MoSQITo | Python | Apache-2.0 | ISO 532-1 (Zwicker) / 532-3 loudness, sharpness, roughness. Reference for a specific-loudness-based masking metric. |
| **Essentia / Essentia.js** | github.com/MTG/essentia; github.com/MTG/essentia.js | C++/Python; WASM | AGPL-3.0 | In-browser loudness (EBU R128), spectral features, centroid. The AGPL affects distribution. |
| **librosa** | github.com/librosa/librosa | Python | ISC | Offline dataset analysis to derive target spectra and offsets. |
| **Meyda** | github.com/meyda/meyda | JS | MIT | Real-time spectral features in Web Audio. |
| **automix-toolkit** (Steinmetz, Vanka, Martínez-Ramírez, Bromham; ISMIR 2022 tutorial) | github.com/csteinmetz1/automix-toolkit | Python/PyTorch | Check (likely Apache-2.0/MIT) | Dataset loaders (ENST-Drums, MedleyDB, DSD100), pretrained DMC/Mix-Wave-U-Net baselines, evaluation recipe. |
| **dasp-pytorch** | github.com/csteinmetz1/dasp-pytorch | Python/PyTorch | Apache-2.0 | Differentiable parametric EQ/compressor. Its biquad formulas match RBJ/Web Audio, so it can serve as an equivalence oracle. |
| **pymixconsole** | github.com/csteinmetz1/pymixconsole | Python | Check | Randomised mixing-console simulation (gain, pan, EQ, compression, reverb). Use it to generate degraded or random conditions. |
| **Matchering** | github.com/sergree/matchering | Python | GPL-3.0 | Reference-track matching of RMS and spectrum. Use as a "reference-matched" comparison condition. |
| **Web Audio Evaluation Tool** | github.com/BrechtDeMan/WebAudioEvaluationTool (also code.soundsoftware.ac.uk [S]) | JS | GPL-3.0 (check) | APE/MUSHRA/AB/ranking interfaces, XML test spec, loudness normalisation, in-browser results. |
| **webMUSHRA** | github.com/audiolabs/webMUSHRA | JS/PHP | Custom permissive (check) | BS.1534-compliant MUSHRA page, BS.1116 and paired comparison [S]. |
| **BeaqleJS** | github.com/HSU-ANT/beaqlejs | JS | GPL-3.0 | ABX and MUSHRA via HTML5 audio [S]. |
| **APE** | code.soundsoftware.ac.uk/projects/ape [S] | MATLAB | GPL (check) | Development stalled [S]. Use the design (single axis, optional reference/anchor, loudness equalisation). |
| **Web Audio API** | w3.org/TR/webaudio | Spec | W3C | BiquadFilterNode (RBJ cookbook), OfflineAudioContext for rendering, AudioWorklet for custom meters. |
| **SAFE plugins** | github.com/semanticaudio/SAFE | C++ (JUCE) | GPL (check) | Descriptor-to-curve data and mappings. |
| **Audealize** (Pardo lab) | audealize.appspot.com / github.com/interactiveaudiolab | JS/Python | Check | Word-map EQ/reverb UI built on the Sabin & Pardo method. |

---

## (d) Resolves our open items

### 1. Role-based level offsets (where instruments sit relative to the mix)
- **Direct empirical sources:**
  - `deman2014analysis` measures per-instrument loudness in professional mixes.
  - `pestana2014intelligent` and `pestana2013automatic` test rules of thumb such as lead vocal level and kick/bass relations.
  - `king2010variance` and `king2012consistency` give the spread of engineers' preferred vocal/solo-to-backing levels and their genre dependence. They define tolerances of a few dB.
  - `wilson2015navigating` shows engineers converge on similar gain settings, so a target balance exists.
  - `deruty2014human` shows level depends on spectrum: brighter tracks are mixed quieter and loudness follows spectral centroid.
- **Derive our own numbers:**
  - MUSDB18-HQ: stem LUFS minus mixture LUFS for vocals, drums, bass and other across 150 songs.
  - MedleyDB: per-instrument stem LUFS against the professional mix.
  - `colonel2021reverse` gives a method to back-solve gains against a reference mix.
  - Report median and IQR per role, as `deman2017perceptual` did for reverb bounds.
- **Subgroups:** apply offsets per subgroup (`ronan2015impact`, `ronan2017analysis`, `ronan2015automatic`).

### 2. Designing a valid listening test of our conditions
- **Paradigm:** mixing has no true reference, so use a multi-stimulus MUSHRA-like test without a mandatory reference. This is the APE/WAET design (`deman2014ape`, `jillings2015web`, `deman2015perceptual`, `deman2016subject`). Optionally include the original professional mix as a hidden "reference" or "anchor-high" condition, and state that this departs from BS.1534.
- **Conditions:**
  - raw unity sum (low anchor);
  - BS.1770 gain staging only;
  - gain staging plus role offsets;
  - gain staging plus offsets plus Hafezi–Reiss EQ;
  - a human or professional mix where available;
  - optionally a learned baseline (Diff-MST, FxNorm-automix) or Matchering to a reference;
  - a 3.5 kHz low-passed version of the human mix as a BS.1534-style low anchor (`itu2015method`).
- **Bias control:**
  - Loudness-match all stimuli with BS.1770; APE and WAET do this. This is required because of the louder-is-better bias (`illenyi1981correlation`, `vickers2010loudness`, `wilson2016perception`).
  - Randomise order and position, and hide identities.
  - Watch range and centring biases (`zielinski2008some`).
- **Rating questions:** `wilson2016perception` shows quality and liking can diverge, while `wilson2016relationship` shows they correlate strongly (R² = 0.82) for mixes. Ask one "overall preference" rating plus optional free-text comments, which carry most of the diagnostic value (`deman2017mix`).
- **Panel:** experts are more critical and agree more with each other (`deman2017mix` [S]; `olive2003differences`; `schinkel2013audio`). Report expertise as a factor. Post-screen using hidden-reference/anchor consistency (`itu2015method`, `liebetrau2014revision`).
- **Remote deployment:** `schoeffler2015towards` and `cartwright2016fast` support web and crowdsourced validity. Require headphones and run a calibration or headphone check.
- **Analysis:** use non-parametric or mixed-effects models per `mendonca2018statistical` and `bech2006perceptual`. Report per-song effects. Use about 15–20 assessors × 6–10 songs, following De Man's studies.
- **Formal references:** BS.1534-3, BS.1116-3 (room and reproduction), BS.1284-2 (general/attributes), and P.800 CCR for pairwise comparisons.

### 3. Target spectra
- `pestana2013spectral`: long-term average spectra of commercial recordings from 1950–2010 converge on a target curve [S]. This is the primary reference.
- `deruty2014human`: spectrum–loudness relations at track level.
- `wilson2016variation` and `wilson2015101`: brightness and bass distributions across many mixes, usable as acceptance ranges [S].
- `wilson2017populating`: distributions of spectral centroid across generated mixes [S].
- Compute our own long-term average spectra on MedleyDB, MUSDB18-HQ and Mix Evaluation mixes with librosa or Essentia.
- `katz2015mastering` and `izhaki2023mixing` provide practitioner context.
- User-adjustable target tilt: SocialEQ, SAFE and 2DEQ (`cartwright2013socialeq`, `stables2014safe`, `stasis2016semantically`).

---

## (e) Notable facts with sources (all [S], from search results)
- **BS.1534-3:** the current MUSHRA revision, approved October 2015. It uses a 0–100 scale with a hidden reference and low-pass anchors, and its grading scale derives from BT.500 (Wikipedia/ITU; AUDITORY list).
- **BS.1116-3:** approved February 2015; supersedes -2 (2014), -1 (1997) and -0 (1994) (itu.int).
- **BS.1284-2:** approved 21 January 2019. BS.1283-2 says which method to use depends on the purpose of the test (itu.int).
- **APE:** single-axis multi-stimulus sliders with an optional reference and anchor, a pairwise mode and a loudness-equalisation stage. Development stalled in favour of the browser tool (AES e-lib 17160; soundsoftware).
- **webMUSHRA:** CC BY 4.0 paper. It supports MUSHRA, BS.1116 and forced-choice, and needs no programming to configure (JORS, doi 10.5334/jors.187).
- **BeaqleJS:** supports ABX and MUSHRA and does not use the Web Audio API (WAC 2015 submission 8).
- **Mix Evaluation Dataset:** 180 mixes and ~5000 ratings from contributors in five countries. Experienced subjects were more negative and more specific, and agreed with each other more (DAFx archive).
- **Reverb:** a universally preferred amount is unlikely, but upper and lower bounds can be identified. Relative reverb loudness and early decay time predict perceived reverb amount (JAES 65(1/2), doi 10.17743/jaes.2016.0062).
- **Wilson & Fazenda 2016:**
  - Quality ratings were most associated with features related to perceived loudness and dynamic range compression.
  - Familiarity affected liking, and expertise had only a small effect.
  - Perceived quality of popular music may have declined over recent years (JAES 64(1/2)).
- **1501 mixes of 10 songs (Cambridge-MT):** four dimensions of variation (amplitude, brightness, bass, width); 8 of the 10 most-mixed sessions were Rock/Punk/Metal (JAES 64(7/8)).
- **101 mixes:** the dimensions (dynamics, treble, width, bass) significantly affected competition ranking (AES 139 paper 9398).
- **Mix-space:** engineers' exploration depended on the starting gains, but they agreed on the gains for a balanced mix (SMC 2015).
- **Deruty et al.:**
  - With good monitoring, brighter tracks were mixed quieter and track loudness followed spectral centroid.
  - With poor monitoring, engineers set spectrum and loudness so that each track stays intelligible (JAES 62(10)).
- **Vickers:** evidence questions the assumption that loudness correlates significantly with listener preference or sales (AES 129 paper 8175).
- **Subgrouping:**
  - Preference for 72 mixes (9 songs, 16 engineers) correlated strongly with the number of subgroups (AES 139 paper 9442).
  - Eight of nine subgrouping assumptions were confirmed by 10 award-winning engineers (AES 142 paper 9700).
- **References in mixing:** 90 % of surveyed engineers use more than one reference song, as a direction rather than a template (Vanka et al., JAES 72(1/2); arXiv 2309.03404).
- **AI adoption:** amateurs find AI mixing adequate, while pro-ams and professionals want control and customisation (Vanka et al., AES Europe 2023).
- **SocialEQ:** learned 324 descriptors in 731 sessions, with 40 EQ values per sample (ISMIR 2013; arXiv 2202.08898).
- **SAFE:** embedding data capture in the DAW reduces musical and environmental bias in descriptor data (ISMIR 2014). Descriptor layout in timbre space is explained by size and dissonance (ACM MM 2016).
- **Izhaki 4th ed. (2023):** adds the loudness war, LUFS targets and DIY mastering. **Owsinski 5th ed. (2022):** adds mixing to LUFS targets and immersive audio.
- **Pestana et al. 2013:** recordings consistently approach a target EQ curve driven by industry practice, which partly resembles the natural spectra of acoustic ensembles (AES 135 paper 8960).
