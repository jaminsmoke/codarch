---
title: The UI no longer has three thousand-line files
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**What it was**: three files in the interface were the biggest in their layer: `panels.tsx` at **979** lines, `useCodarchApp.tsx` at **837** and `ChangesPanel.tsx` at **759**. `panels.tsx` held the legend, the language strata, the file inspector, the code sample and three commit lists; the hook held the map camera, document loading, shortcuts and preferences; the changes tab held its seven different rows.

**What it is**: each piece lives in its own module and what remains is the glue. `panels.tsx` drops to **7** lines and gathers `panels/` — `Inspector`, `CodePeek`, `Legend`, `LanguageSample`, `HistoryPanel`, `HeatList`, `Kpi`. `ChangesPanel.tsx` drops to **387** and its rows live in `changes/` — `FileEntry`, `BalanceRow`, `HistoryRow`, `TouchedRows` and `summary`. The hook drops to **528** and spreads its work across `app/` — `types`, `camera`, `documents`, `preferences`, `shortcuts` and `snapshotView`. That is eighteen new modules, 1954 lines between them.

**Why this way**: the cut follows what each block knows, not its size: the camera only knows about zoom and centre, documents only about parsing and saving, and a row only about its own thing. What stays in the hook is what belongs to the whole app —what is derived from the snapshot, what is selected, which views the plugins bring—. The decision of which view a snapshot opens with moved to `snapshotView` because it is the only part of loading that can be read without opening a file, and therefore tested on its own.

**How it is checked**: the 205 cases in `packages/ui/test` keep passing without changing a single test line, and `snapshotView.test.ts` adds **11** for the new decisions —which area and colour a snapshot opens with, and what survives a refresh—. In the app open against the repo: the map, the rail, the card with its sections, a symbol's drawer, the changes tab with its balance and the zoom all behave the same. The highest complexity among the new modules is **20** (`Inspector`) and the hook drops to **17**.

**Verdict**: refactor closed. `Inspector` is now the largest UI file at 594 lines with six sections inside; splitting it by section is the next pass.
