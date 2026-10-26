---
title: The files of the change, in one list
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: **Changes** had one section for modified files and another for new ones. Deleted files had no list: only a `−1` in the six-figure grid, which also repeated the count of hotspots, symbols and migration debt that their headers already carried. And the three lists did not speak the same unit: modified files showed the two metrics that moved, new ones a `+rloc`, deleted ones nothing.

**What changed**: a single **Files** section, the last in the tab, with three groups —**New**, **Modified**, **Deleted**— and one row per file: status letter in its colour (`A` patina, `M` ochre, `D` debt), path and the `rloc` delta, the same figure for all three. If `rloc` did not move, the metric that moved the most carries its name; the rest lives in the tooltip. A deleted file is not a button: it is not in the head snapshot and its tooltip says so. Each group is cut at 25, like **Rules**. The grid is gone and a single line keeps **Edges** and **Cycles**, only when one of the four figures moves.

**Numbers**: in the three-file test, the three lists become one section: `1 new · 1 modified · 1 deleted` in the header, `src/c.ts` `A +3`, `src/a.ts` `M +6`, `src/viejo.ts` `D −4`. The tab loses one section and gains the list of deleted files. Neither `report.json` nor the checksum changes: the three groups already came in `report.files`.

**What is left**: the metrics table of **Changes** is still undecided, and the ten rail blocks are still not collapsible (M49).

**Verdict**: [ADR 0070](../../adr/0061-0070/0070-los-ficheros-del-cambio-en-una-lista.md), done.
