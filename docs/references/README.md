# The dream library

`library.bib` is the reading list for this project: automatic mixing,
demasking, dynamics, filter design, psychoacoustics and loudness,
perceptual evaluation, mixing practice, datasets and data-driven mixing.
It was compiled on 2026-10-10 by five parallel literature searches and
merged here. This page is the addendum: how to read the file, what to
acquire first, and where the material that does not fit BibTeX lives.

| | Count |
|---|---|
| Entries | 350 |
| `verified = {yes}` (title, authors, venue and year confirmed by a search result) | 178 |
| `verified = {partial}` (some fields from memory; check before citing) | 172 |

The searches shared a web-search budget that ran out partway through each
of them, so the partial entries are mostly the classics, the textbooks,
pages and issue numbers, and the later papers in each topic. Every partial
entry still names a real work as far as the searches could tell; what is
uncertain is listed per topic in the notes below. No DOI was added unless
a search result showed it.

## Reading the file

- **Parts.** The file is in five parts, by topic: A automatic mixing
  systems; B dynamics, time-based effects, mastering and filter design;
  C psychoacoustics, auditory models, standards and masking measures;
  D evaluation, mixing practice, semantic audio, datasets and tools;
  E data-driven mixing, adoption studies and patents.
- **Keys** are `firstauthorYYYYfirstword`, with a second word or a letter
  where two works would collide.
- **Custom fields** (ignored by BibTeX and biblatex styles):
  - `keywords`: topic tags from a fixed list: automix-level, automix-pan,
    automix-eq, masking, automix-dynamics, automix-reverb, automix-other,
    deep-learning, mastering, loudness, psychoacoustics, auditory-models,
    perceptual-evaluation, listening-tests, mixing-practice,
    semantic-audio, dsp-filters, datasets, tools, review, standards.
  - `annote`: one sentence on why the source matters to this project.
  - `verified`: `yes` or `partial`, as above.
- **Standards** are `@techreport` or `@misc` entries with the edition or year in the key and
  the note; the notes on psychoacoustics and standards list every version
  and which to implement.
- **Patents** are `@misc` entries with the assignee and priority year in
  the note.

## Notes per topic

Each file lists the items that could not be pinned down, the open items
its sources resolve, and notable facts with their sources.

| File | Covers |
|---|---|
| [notes/automatic-mixing.md](notes/automatic-mixing.md) | Perez Gonzalez, Mansbridge, Ward, Terrell, Hafezi, Ronan, De Man, Pestana, Ma and others; open-access copies of the key papers |
| [notes/dynamics-and-filters.md](notes/dynamics-and-filters.md) | Grounding automatic compression; why some EQ sounds "filtered or phasey"; Web Audio–compatible filter formulas |
| [notes/psychoacoustics-and-standards.md](notes/psychoacoustics-and-standards.md) | Every version of BS.1770, EBU R128 and Tech 3341/3342/3343, ISO 532, ISO 226, BS.1387 (PEAQ), MPEG models; partial loudness; better masking models; stereo-aware measures |
| [notes/evaluation-practice-datasets.md](notes/evaluation-practice-datasets.md) | Datasets (with stems and reference mixes, licences), repositories and tools, listening-test design, role-based level offsets, target spectra |
| [notes/data-driven-and-commercial.md](notes/data-driven-and-commercial.md) | Commercial demaskers and assistants (not in the .bib), patents not fully confirmed, which learned methods could run in a browser or output readable settings |

Datasets, repositories, products and web pages with no citable paper are
in those notes, not in the .bib.

## Reading priorities

The app tags every EQ parameter documented, inferred or unverified, and
lists what is not implemented (`src/ui/litParams.js`). This table maps
each of those items to the sources that should settle it. Acquire these
first.

| Open item in the app | Read | What to look for |
|---|---|---|
| Essential / nonessential threshold (*Essential range*, unverified) | `hafezi2015autonomous`; open-access copy at <https://qmro.qmul.ac.uk/xmlui/handle/123456789/7804>; `valimaki2016all` | How a band is classed essential for a track, and any numeric threshold or rank rule. |
| Max cut, and what the one user parameter scales | `hafezi2015autonomous`; `ronan2018automatic` | An explicit bound on cut depth; whether the parameter scales or limits the gain. |
| Hafezi & Reiss real-time variant (not implemented) | `hafezi2015autonomous` | The frame-wise masking estimate and its smoothing; the same paper describes both systems. |
| High-pass frequency and the role table (unverified) | `deman2013semantic` (open access: <https://core.ac.uk/download/pdf/30696852.pdf>); `deman2013knowledge`; `deman2019intelligent`; `pestana2014intelligent` | Rules of the form "instrument → HPF at f Hz", and which instruments are excluded. |
| Whether the 2009 spectral balance boosts (*Allow boosts*, unverified) | `perezgonzalez2009automaticequalization`; `perezgonzalez2010advanced` (thesis, open access); `perezgonzalez2011automatic` (DAFX chapter with MATLAB code) | The gain law and its bounds. The stated goal, equal average perceptual loudness in every band across channels, implies moves in both directions. |
| ISO 226 weighting instead of A-weighting (*Perceptual weighting*, inferred) | `iso2023normal`; `suzuki2024revision`; `glasberg2006prediction` | The contour formula and tables; the 2003 and 2023 editions differ by at most 0.6 dB. |
| Partial-loudness faders, Ward, Reiss & Athwal 2012 (not implemented) | `ward2012multitrack`; `ward2017applications` (thesis, open access); `moore1997model`; `glasberg2002model`; `glasberg2005development`; ISO 532-3:2023 | The partial-loudness model, the target (equal loudness of every track inside the mix), and how the gains are solved. |
| Masking minimisation with subgroups, Ronan et al. 2018 (not implemented) | `ronan2018automatic`; `ronan2015automatic`; `ma2016intelligent`; `iso1993mpeg1audio`; `painter2000perceptual` | The MPEG-style masking model, the objective, the optimiser and the parameters it moves. |
| Free filter centres (not implemented) | `ma2013implementation`; `valimaki2016all` | Curve fitting (Yule-Walker) or peak-placed filters instead of fixed bands. |
| Role offsets in the Gain workspace (heuristic) | `mansbridge2012implementation`; `deman2014analysis`; `pestana2014intelligent`; `king2010variance`; `wilson2015navigating`; `deruty2014human` | Measured per-instrument levels relative to the mix and their spread. The notes also describe deriving offsets from MUSDB18-HQ and MedleyDB. |
| Automatic compression (next stage) | `giannoulis2012digital`; `giannoulis2013parameter`; `ma2015intelligent`; `maddams2012autonomous`; `itu2023algorithms` (true peak) | A compressor design that runs in an AudioWorklet, and rules for its parameters from loudness and loudness range. |
| A better masking measure for evaluation | `itu2023bs1387` (PEAQ); `thiede2000peaq`; `aichinger2011describing`; `lavandier2010prediction` (stereo) | Level-dependent spreading, temporal masking, and a better-ear measure for panned stems. |
| Listening-test design | `itu2015method` (BS.1534-3); `bech2006perceptual`; `deman2015perceptual`; `jillings2015web`; `wilson2016perception` | Multi-stimulus without a mandatory reference, loudness-matched stimuli, anchors, post-screening and analysis. |
| Why some EQ sounds "phasey" | `lipshitz1982audibility`; `toole1988modification`; `clifford2013using`; `cecchi2023crossover` | Minimum-phase shift itself is rarely audible; comb filtering from bleed or parallel paths, and stacked resonances, are the likely causes. |

## Redirected keys

The same work was found by more than one search. The best-verified copy
kept its key; these keys were merged into it:

| Merged key | Now |
|---|---|
| `terrell2009automatic` | `terrell2009automaticnoise` |
| `martinezramirez2020deep` | `martinezramirez2020deepa` |
| `itu2023bs1770` | `itu2023algorithms` |
| `ebu2023loudness` | `ebu2023tech3342` |
| `adenot2021web` | `w3c2021web` |
| `itu2015bs1534` | `itu2015method` |
| `vanka2023role` | `vanka2024role` |
| `steinmetz2022automix` | `steinmetz2022deep` |

The notes files already use the kept keys.

## Also in this folder

`../papers/WIMP3.pdf` is the full text of De Man, Reiss & Stables, "Ten
years of automatic mixing" (2017), `deman2017ten`. Add acquired papers
next to it under `docs/papers/`, named by their key.
