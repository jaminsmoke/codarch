---
title: "The project sheet, like the file's"
date: "2026-10-30"
category: "feature"
verdict: "arreglo"
---

**What it was**: the project sheet had its own idea of **Métricas**: a list of four totals —files, folders, lines and complexity— with lint as one more row. The file sheet, by contrast, shows a table with name, bar, value and help since ADR 0060. Meanwhile the snapshot carried seventeen metrics and the project sheet kept thirteen of them quiet. And the word trap was still there: **Métricas** said "0 errors · 0 warnings" —findings— while **Reglas** said "22 errors · 2 warnings" —rules configured with that severity—, two phrases that looked like the same data and were not.

**What changes**: **Métricas** is now the file sheet's table with another subject: one row per metric in the snapshot, the bar as **coverage** —the part of the files that carries it— and the value as a sum; metrics that are already a per-file maximum (complexity, longest function, dependency level, cycles) are not added up: the largest is shown with its owner. Clicking a row paints the map, as in the file sheet. **Lint** is a block inside Métricas with its three counts —errors, warnings and info—, files with findings and score, plus **Lint por carpeta** with err., avis. and info and score; the file and folder counts stay in the sheet header, which already said them. **Reglas** stops aggregating severities: a system carries its rule, its pill and its bar, with no numbers, and severity is read rule by rule. The shared counter adds up from messages and exposes `info`, so the app, the CLI and the MCP read the same count.

**Why this way**: a metric has to read the same in all three sheets, and what changes is the subject, not the format. The file's bar reaches the p95; a sum is not compared with a single file's p95, so in project and folder the bar says the only thing that can be read without lying: how much of the subtree carries the data. And a total of configured rules cannot be called "errors" next to a section that counts real errors.

**Verified**: tests for `rollupMetricRows` —sum, maximum with owner, coverage, derived complexity row, area mark— and for the sheet with the new format; 303 UI tests green. Render with this repo's real snapshot: 17 metric rows, `0 errores · 0 avisos · 0 info`, `0 ficheros con hallazgos · score 0`, and in Reglas only `24 reglas activas`, with no total that can be mistaken for findings. Typecheck, lint, suite, web and site green.

**Verdict**: fix.
