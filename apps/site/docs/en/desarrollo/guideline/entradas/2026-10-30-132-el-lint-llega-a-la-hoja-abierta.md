---
title: "Lint reaches the sheet you have open"
date: "2026-10-30"
category: "fix"
verdict: "arreglo"
---

**What it was**: with live on, saving a file could not be seen in the sheet you were reading. When the new snapshot arrived, the effect that keeps the chosen file went through `selectIndex`, which switches sheets when there is a file: **Proyecto** and **Carpeta** closed and the app fell back to **Fichero**, right before lint finished measuring. The count did arrive: it was the sheet that was wrong. Besides, a lint pass already running dropped the notices that came meanwhile —the artifact kept counting the tree from two saves ago— and the same tree could be linted twice, which is two full ESLint runs.

**What changes**: the app restores the selection with `restoreIndex`, which leaves the tab alone, and `tabAfterModelRefresh` decides which sheet stays: **Proyecto** remains open with new data and **Carpeta** only falls when the refresh took the folder away, which then has nothing to tell. In `serve`, lint goes through `createLintQueue`: a save that arrives during a pass is noted and linted when it ends, once and with the latest root; and `serve-live` does not request the same checksum twice, so a tree is never measured twice.

**Why this way**: a refresh is not a user choice. The rule that a sheet never talks about another subject holds for a click —selecting a file closes the folder—, not for live, which returns the file that was already there. And lint is expensive enough not to launch it twice on the same tree or throw away the one that comes late.

**Verified**: the zero is real, measured outside the product: `oxlint .` with 0 diagnostics, `eslint .` with 494 files, 0 errors and 0 warnings, and `.codarch/lint.cc.json` with `files: {}`. Live, with the **Proyecto** sheet open: a test `var` in `scripts/version.mjs` leaves it at `1 error · 2 avisos` without closing it —and with the `scripts/` row in the per-folder breakdown—, and reverting it goes back to `0 errores`. The count arrives with the artifact: about 11 s in `serve` with nothing else in front, which is what a full ESLint pass over 500 files costs; with Vite and Chrome competing for CPU, about 21 s. New tests for the queue (`lint-queue`) and for the sheet after a refresh (`viewState`); typecheck and the `apps/cli` and `packages/ui` suites green.

**Verdict**: fix.
