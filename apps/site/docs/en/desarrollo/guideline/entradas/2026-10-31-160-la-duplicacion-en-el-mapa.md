---
title: "Duplication enters the map"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**What it was**: the duplication lens was already measured in the snapshot (M68), but only whoever
opened the JSON saw it. The map could be painted with `duplicatedLines`, yet the file card did not say
how many lines those were or who they were shared with, and the folder and project sheets had no figure
of their own.

**What changes**: the model crosses the lens with the files once (`model-duplication`) and all three
sheets read the same thing. A file gains **Duplication**: duplicated lines, repeated lines, proportion
over its `rloc`, the twin when it is a literal copy, and its pairs with similarity and lines. A folder
and the project add lines and divide **once** by the subtree's `rloc`. The `duplicatedLines` colour is
accepted even when the lens is missing —like lint— so a link does not silently fall back to risk: the
band says "without duplication measured" and the legend counts files and pairs. `codarch shot` paints
the same colour with the same scale, because the PNG and the app come from the same model.

**Why this way**: adding percentages would state a figure that does not exist. Lines do add up and the
proportion is calculated at the end, which is the rule of the snapshot's own summary. Duplication is not
merged into migration debt: they are two readings shown side by side (ADR 0102). The notice separates
"no copies" from "not measured", the same distinction lint already makes with its artefact.

**Verified**: the whole suite is green at **176 files and 1533 tests**. New tests cover the model
(crossed lens, pairs from both sides, scale and a snapshot without the lens), the shot (colour, legend
and cell value), the three sheets (file proportion, project and folder sums, "not measured") and the
band notice. Typecheck and lint clean and the site built.

**Verdict**: done. M69 closes; M70 (divergence with a name) and M71 (the diff) remain.
