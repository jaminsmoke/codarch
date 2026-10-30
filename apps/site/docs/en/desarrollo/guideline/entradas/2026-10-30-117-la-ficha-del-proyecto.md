---
title: "The project has its sheet"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**What it was**: the dock had three sheets —file, folder and changes— and the root was none of them. The repo's total was only read in the header, and the lint from [ADR 0094](../../adr/0091-0100/0094-el-lint-en-el-mapa.md) stayed in the file. The folder sheet had no metrics yet.

**What changes**: the dock gains **Proyecto**, an always-available sheet, and both sheets share a **Métricas** section with the same reading: files, folders, lines and code lines added up, and the maximum complexity **with the file that has it**. Lint sits inside, as one more row —errors, warnings, files with findings and its score, `errors + ¼ warnings`— and ends with **Lint por carpeta**: one row per child folder with files, errors, warnings and score that opens that folder's sheet, which counts the same over its subtree. That is the whole way down: project → folder → subfolder → file. Without an artifact the row says **sin medir** and what it will weigh. The sheet travels as `tab=project` and `PluginUrlState.tab` learns the name. The count lives in `lintRollup`, over the artifact, with the score from `metrics` and membership by slash (`packages/ui` does not contain `packages/ui2`).

**Why this way**: lint is a metric and a risk signal; a section of its own would split the sheet into two stories. And there is no «project risk»: risk is normalised by the project's p95 and belongs to each file, so an aggregate with that name cannot be acted on; quantities add up and maxima say whose they are (ADR 0092).

**Verified**: new tests for the rollup (project, folder, prefix, clean artifact and no artifact), for both sheets —with and without `lint.json`—, for the metric sums, for the subtree folders and for the fourth tab in the URL and the bar. Full suite (1,209), lint and typecheck green, and the project sheet mounted on the repo's real snapshot: 468 files, 67 folders, maximum complexity 22 in `apps/mcp/src/index.ts` and the debt from its `lint.json` (0 errors, 0 warnings, score 0) with `apps/`, `packages/`, `plugins/vista-3d/` and `scripts/`.

**What is missing**: the maximum risk with its owner in the folder sheet, the Linter lens with its messages, lint in the MCP and a capture of the new sheet.

**Verdict**: phase in progress.
