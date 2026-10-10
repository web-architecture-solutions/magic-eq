# A-automix: notes

Companion to `A-automix.bib`: 61 entries, 38 with `verified = {yes}` and 23 with `verified = {partial}`.

**Search budget.** The shared WebSearch limit (200 calls per turn across all agents) ran out partway through. About 30 searches ran before that. These items were never searched and rest only on the WIMP 2017 reference list (`wimp3.txt`) plus my memory for full names, places and pages: Wichern 2015, Matz 2015, Everardo 2017, Tsilfidis 2009, Dugan 1975, Julstrom and Tichy 1984, Bocko 2010, Pachet 2000, Reed 2000, Katayose 2005, Dannenberg 2007, Deruty 2016, Ford 2015, Wilson and Fazenda 2016 (JAES). All are marked `partial`. A follow-up session with fresh search budget should confirm them first.

**What `partial` means here.** The title, venue and year come from a search result or from the WIMP 2017 reference list. Some other fields (full first names, conference city, volume or issue) come from memory.

**Key collisions.** Two pairs of papers would share a key under the plain rule:
- `perezgonzalez2009automaticgain` is the WASPAA fader paper; `perezgonzalez2009automaticequalization` is the AES 127 EQ paper.
- `terrell2009automaticmonitor` is the JAES paper; `terrell2009automaticnoise` is the DAFx-09 paper.

---

## (a) Items I could not pin down, and why

### Not in library.bib: existence or year not confirmed by search

| Candidate | What I believe | Why it is excluded |
|---|---|---|
| Ma, Reiss & Black, "Partial loudness in multitrack mixing", AES 53rd Int. Conf. (Semantic Audio), 2014 | Exists (memory). It is about partial-loudness faders, so relevant to the Ward item. | Not searched (budget). |
| Ward, Athwal & Reiss, "Automating time varying gains in multi-track mixing using a model of loudness and partial loudness", AES 133, 2012 | The BCU repository lists this title. The AES abstract is identical to `ward2012multitrack` (Paper 8693). | Probably a repository alias of the same paper rather than a second paper. Left out to avoid a duplicate. |
| Moffat & Sandler, "Approaches in Intelligent Music Production", *Arts* 8(4), 2019 | A review (memory). | Not searched. |
| Later reviews and surveys, 2019–2026 | Not searched (budget). | |
| arXiv 2609.02835, "Understanding Automatic Mixing: A Subtask-Oriented Analysis of Two-Stage Mixing System" (2026) | Turned up in a search result. Probably deep learning. | Authors and venue unknown. |
| arXiv 2412.03373, "Exploring trends in audio mixes and masters: Insights from a dataset analysis" | Turned up in a search result. | Authors and venue unknown. Likely belongs in a datasets or mixing-practice scope. |
| SMC 2024 paper id126 (Politecnico di Torino); arXiv 2404.17821 | Both cite Hafezi & Reiss (found by search). | Titles and authors not seen. |
| Sowula, R., "Improving music mixability by using rule-based stem ..." (TU Wien, 2024) | Turned up in a search result. | Master's-level thesis; title truncated. |
| Belmont University MSAE thesis, "An Analysis of Perceptual Masking between Stems in ..." | Turned up in a search result. | Title truncated, author unknown. |
| Patent US 9,654,869 B2 / WO2013167884A1, "System and method for autonomous multi-track audio processing" (QMUL / LANDR; Reiss, Mansbridge et al.) | Confirmed to exist by search (Google Patents). | First inventor and year not confirmed. It covers the fader and pan algorithms of Mansbridge et al. |
| Patent US 9,304,988, "System and method for performing automatic audio production using semantic data" | Confirmed to exist by search. | Inventors not seen. It is very likely the patent for the De Man & Reiss semantic or knowledge-engineered system, so its claims may list the HPF rules. |
| Patent US 8,929,561, "System and method for automated audio mix equalization and mix visualization" | Confirmed to exist by search. | Inventors not seen. |

### In library.bib, with caveats

- **`reiss2011intelligent`**: the caller named it, but it was not confirmed by search. I believe the DOI is 10.1109/ICDSP.2011.6004988, but it is unverified and omitted. Confirm it before citing.
- **`reiss2018applications`**: authors and title come from memory. The DOI 10.3389/fdigh.2018.00017 did surface in a search for Perez Gonzalez's gain-normalisation paper, which fits this being Reiss & Brandtsegg's overview, but the page title was not shown.
- **`hafezi2015autonomous`**: pages 312–323 and DOI 10.17743/jaes.2015.0021 come from a search-engine summary, not from the AES page itself. They are likely right but worth checking.
- **`deman2019intelligent`**: no DOI was found. The Routledge e-book ISBN is 9781315166100, which suggests DOI 10.4324/9781315166100, but I did not see that DOI, so it is not in the entry. Sources disagree on the publisher name (Focal Press, Routledge, or CRC Press).
- **`terrell2014mathematics`, `terrell2009automaticmonitor`, `terrell2012offline`**: no page numbers or DOIs were found.
- **`perezgonzalez2008automatic`**: one search summary said it was "later published in JAES". This is unconfirmed and probably wrong.
- **`ronan2018automatic`**: the arXiv record says a newer version was withdrawn by the author, so cite v1 (2018). No journal version was found.
- **`ronan2017analysis`**: the title and venue (AES 142, 2017) appeared in a search result. The author list comes from memory.
- **`jillings2023automating`**: the thesis was submitted in November 2022 and the award dated October 2023, according to the repository file name. The year 2023 is my choice.
- **`kolasinski2008framework`**: the first name "Bennett" comes from memory.

### Out of scope for this file (from the WIMP list), left to other agents

- Dynamics: Giannoulis et al. 2013 (single-track compressor automation), Hilsamer & Herzog 2014, Mason et al. 2015.
- Mastering EQ: Mimilakis et al. 2013 (tonal balance).
- Deep learning: Mimilakis 2016 (both papers).
- Reverb: Chourdakis & Reiss 2016 and 2017; Benito & Reiss 2017; De Man, McNally & Reiss 2017.
- Datasets: De Man 2014 (Open Multitrack Testbed), Bittner 2014 and 2016 (MedleyDB), De Man & Reiss 2017 (Mix Evaluation Dataset).
- Semantic EQ: Stasis et al. 2015, Stables et al. 2016.
- Distortion: De Man & Reiss 2014 (amplitude distortion).
- Mixing practice and context: Jillings & Stables 2017, Bromham 2017, Toulson 2008, Pras et al. 2013.

Deep-learning automix papers seen in passing (Steinmetz et al. 2020, arXiv 2010.10291; Martínez-Ramírez et al. 2022, arXiv 2208.11428) are also left out.

---

## (b) Resolves our open items

| Open item | Keys to read | What to look for |
|---|---|---|
| **Essential/nonessential threshold in Hafezi & Reiss** | `hafezi2015autonomous` (primary); `valimaki2016all` (open-access summary); `ronan2018automatic` (related-work section); `ma2016intelligent` | In Hafezi: the section defining the masking measure, i.e. how a band is classed "essential" for the maskee and "nonessential" for the masker (a dominance criterion relative to the track's own spectrum or to other tracks), any numeric threshold, and the number of bands. Välimäki & Reiss say essential regions are "most likely the highest amplitude portions of spectrum" and nonessential regions are those easy to attenuate with little timbre change, which suggests a rank or percentile rule on the track's own band levels. The open-access QMRO copy is at https://qmro.qmul.ac.uk/xmlui/handle/123456789/7804. |
| **Hafezi's real-time variant** | `hafezi2015autonomous` | The same paper has both an offline system and a real-time, low-latency system. Compare the real-time masking estimate and smoothing with the offline top-3, Q = 2 rule. |
| **Any max-cut clamp** | `hafezi2015autonomous` (what the single user parameter does: does it scale or limit the cut depth?); `ronan2018automatic` (parameter bounds given to the optimiser); `ma2016intelligent`; `perezgonzalez2008automatic` (gain-normalisation bounds) | An explicit limit in dB on gain change per band. |
| **HPF frequency and role table in De Man & Reiss** | `deman2013semantic` (open-access PDF: https://core.ac.uk/download/pdf/30696852.pdf); `deman2013knowledge`; `deman2017towards`; `deman2019intelligent` (chapter on knowledge-engineered or rule-based systems); `pestana2013automatic` and `pestana2014intelligent` (best-practice HPF guidance); US patent 9,304,988 (claims or examples may list rules) | The rule base. The processor list is confirmed as HPF, DRC, EQ, fader and pan pot. Look for rules of the form "instrument X → HPF at f Hz", and which instruments are excluded (kick, bass). |
| **Whether the 2009 EQ boosts** | `perezgonzalez2009automaticequalization`; `perezgonzalez2010advanced` (open-access thesis; most detail); `perezgonzalez2011automatic` (DAFX chapter, with MATLAB code at https://dafx.de/DAFX_Book_Page_2nd_edition/chapter13.html) | The abstract aims at "equal average perceptual loudness on all frequencies amongst all multi-track channels", which implies moving each band toward the cross-channel average in both directions. Check the filterbank gain law and any bounds. The MATLAB code is the quickest check. |
| **Ward, Reiss & Athwal 2012 partial-loudness faders** | `ward2012multitrack`; `ward2017applications` (open-access PDF: https://www.open-access.bcu.ac.uk/7228/1/PhD%20Thesis.pdf); `terrell2014mathematics` | Which loudness model is used (Glasberg & Moore time-varying and partial loudness), the target (equal loudness of all tracks inside the mix), how gains are solved (iteration), and the time resolution. |
| **Ronan et al. 2018 masking minimisation with subgroups (optimiser)** | `ronan2018automatic` (arXiv v1); `ronan2015automatic` (subgroup formation); `ronan2015impact`; `ma2016intelligent` (Ma is a co-author; its EQ and compression tools are what get optimised) | The masking metric (MPEG psychoacoustic model per track against the rest of the mix), the objective function, the optimiser type, and the parameters optimised (EQ gains/bands and DRC). My search could not confirm which optimiser is used, for example whether it is particle swarm. |
| **Free filter centres at spectral peaks** | `ma2013implementation` (Yule-Walker IIR fit to an arbitrary target curve, so no fixed centres at all); `hafezi2015autonomous` (whether band centres are fixed); `perezgonzalez2009automaticequalization` (fixed filterbank); `valimaki2016all` (survey of EQ designs) | Whether any of these systems places peaking filters at detected spectral peaks, or uses fixed bands or curve fitting instead. |
| **Gain staging with role offsets (implemented; for validation)** | `mansbridge2012implementation`; `perezgonzalez2009automaticgain`; `wichern2015comparison`; `scott2013instrument`; `pestana2014intelligent`; `deman2014analysis`; `jillings2023automating` | Whether published systems use plain equal loudness (Perez Gonzalez, Mansbridge, Ward) or instrument-specific offsets (Scott & Kim, De Man KEAMS). Look for empirical per-instrument level offsets in Pestana, De Man 2014 and Jillings. |

---

## (c) Notable things learned (with source)

- **Mansbridge, Finn & Reiss 2012 (AES 132, Paper 8588).** The faders use the EBU R128 loudness measure in a cross-adaptive process, with a hysteresis loudness gate and selective smoothing so intentional dynamics are not flattened. The listening test compared it with a human mix and with an earlier automatic fader. (Source: AES E-Library abstract, aes2.org id=16226.) Our BS.1770 gain staging should consider the hysteresis gate as well as the standard BS.1770 gating.
- **Perez Gonzalez & Reiss 2008 gain normalisation.** It normalises a changing linear system to keep maximum unitary gain, working from an impulse measurement of a model of the system. It was tested with a parametric filter, and compensations "of up to -50 dB were achieved without howling". (Source: ResearchGate and Semantic Scholar abstract.) This is a ready-made method for post-EQ level compensation.
- **Perez Gonzalez & Reiss 2009 EQ (AES 127, Paper 7830).** The goal is "equal average perceptual loudness on all frequencies amongst all multi-track channels", using spectral decomposition and cross-adaptive effects. (Source: AES E-Library abstract, id=15026.)
- **Perez Gonzalez & Reiss 2010 panning (EURASIP).** It beat a non-expert, and its listening-test result was not significantly different from a professional engineer. (Source: open-access abstract.)
- **Ward, Reiss & Athwal 2012.** The premise is that "a balanced mix is one in which the loudness of all instruments are equal". Loudness is measured in quiet and in every combination with the other tracks. Partial loudness counteracts energetic masking. (Source: AES abstract, id=16436.) The BCU repository lists the authors in a different order (Ward, Athwal, Reiss).
- **Hafezi & Reiss 2015.** The masking measure is "simplified … based on best practices" and identifies "nonessential maskers and essential maskees" from frequency-region dominance. The offline variant, especially the fully autonomous one, gave significant masking reduction. Objective and subjective results were mixed, but the mixes were preferred over amateur manual mixes. The Aichinger masking model was reportedly used for objective evaluation because it gives a single value with no manual tuning. (Sources: AES abstract id=17637; ResearchGate/Academia abstract; MDPI review `valimaki2016all`.)
- **De Man & Reiss 2013 (KEAMS).** Each rule names one of five processors: HPF, DRC, EQ, fader, pan pot. Rules are read from the rule base and applied to the matching input tracks. Listening tests found it comparable to human engineers and better than earlier feature-only automatic systems. (Source: search summary of the paper and the JARP abstract.) The rules were compiled from practical mixing-engineering literature (`deman2013semantic`).
- **Terrell & Reiss DAFx-09.** The best gate threshold is "slightly above the peak level of the noise component". (Source: DAFx-09 abstract.) This matters if stems with bleed are gated before loudness measurement.
- **Ronan et al. DAFx-15.** On five test multitracks, the full 159-feature set mis-clustered 35.08% of tracks, against 7.89% for the Random-Forest-selected subset. (Source: QMRO abstract.)
- **Ronan et al. AES 139.** Across 72 mixes of 9 songs by 16 engineers, preference "strongly correlates with the number of subgroups". (Source: AES abstract id=17998.)
- **Ma et al. 2015 DRC (JAES 63(6):412–426, doi 10.17743/jaes.2015.0053).** Ratio and threshold were set by multiple linear regression on an experiment about how engineers choose them. The resulting mixes compete with semi-professional manual mixes. (Source: QMRO / UCP records.)
- **Ma 2016 thesis.** It reports "a consistent leaning towards a target equalization spectrum" in commercial recordings. (Source: QMRO abstract.) This target could replace or complement the cross-channel average used by the 2009 EQ.
- **Scott & Kim 2013.** Gain, panning and coarse EQ are applied by instrument type, assuming the instruments are known. (Source: ISMIR abstract.) This is the closest published analogue to our role table.
- **Pestana & Reiss 2014.** The authors say they are interested in conclusions that contradict assumptions in earlier research. (Source: abstract.) Check whether these include the equal-loudness assumption.
- **De Man 2017 thesis.** It introduces a database of 600 multitrack recordings, mixes evaluated by 33 expert listeners, and repeated experiments with 180 mixes and 150 subjects. (Source: QMRO abstract.)
- **Open-access full texts** (worth fetching from a host whose DNS works):
  - Perez Gonzalez thesis: https://core.ac.uk/download/pdf/30695283.pdf
  - De Man semantic approach: https://core.ac.uk/download/pdf/30696852.pdf
  - Pestana & Reiss 2014: QMRO bitstream (see `.bib` url)
  - Ward thesis: https://www.open-access.bcu.ac.uk/7228/1/PhD%20Thesis.pdf
  - Jillings thesis: https://www.open-access.bcu.ac.uk/15026/
  - Pestana DAFx-14: https://dafx14.uni-erlangen.de/papers/dafx14_pedro_d._pestana_a_cross_adaptive_dynamic_.pdf
  - ISMIR papers: archives.ismir.net
  - Ronan et al.: arXiv 1803.09960
  - DAFX chapter 13 MATLAB code: https://dafx.de/DAFX_Book_Page_2nd_edition/chapter13.html
