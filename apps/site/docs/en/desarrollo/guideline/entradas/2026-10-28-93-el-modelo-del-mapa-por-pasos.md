---
title: The map's model is built in steps
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**What it was**: `buildRenderModel` built the map's model in a single function of about 230 lines and complexity **50**, the highest in the repository after the analysis core refactor. Inside it, the area was decided, the tree was walked, risk was computed, sections were grouped, metrics were measured, edges were deduplicated and the file that opens selected was picked.

**What it is**: each decision is a function that writes a single thing into the files. `resolveAreaMetric` picks the area —or complains, if the requested one is missing—; `collectMetricKeys` decides which metrics the model carries; `collectFiles` walks the tree; `warnAboutArea` says which files are drawn with a minimum area; `applyRisk`, `buildSections` and `applyMetricValues` fill in the rest; `buildMetrics` measures the scale; `collectDependency` leaves the edges and the cycles; `resolveLens` decides which lens the map opens with. `buildRenderModel` calls them in order and assembles the result.

**Why this way**: risk is not a per-file thing, it is a property of the whole set —its weights are renormalised according to what is missing—, so it is computed once over the array and not inside the walk. And the edges looked too much alike to live apart: deduplicating, flagging cycles and sorting belong together or the next person to touch them skips a step. What is left in the orchestrator is the list of steps, which is the only thing to read to know how the model comes out.

**How it is checked**: the model from `HEAD` and the current one, serialised, are **identical byte for byte** over the repository's real snapshot (386 files, 301 953 bytes); `buildRenderModel` complexity drops from **50 to 16** and the 11 cases in `packages/render/test/model.test.ts` keep passing, including the determinism one.

**Verdict**: refactor closed. The map still draws the same and the file `codarch` watches is no longer among the worst.
