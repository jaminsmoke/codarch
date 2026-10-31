---
title: "The map model, by trade"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: `packages/render/src/model.ts` had 835 lines and seven trades: the contract shared by the
SVG, the client and the capture; the list of curated metrics and their scales; the building of the files
with their area, their kind and their four risk signals; the sections with their colour per folder; the
folder tree; the edges and cycles; and the initial lens with its selection. All under two `export`s and one
`buildRenderModel` function calling fourteen private ones spread across the file.

**What changes**: the file is down to 138 lines and only wires the phases; each trade lives in a sibling
module, with the model prefix so you can tell what they belong to:

| Module | What it is |
|---|---|
| `model-types.ts` | the contract: lens, options, metadata, file, section, metric, tree, edge, model |
| `model-files.ts` | the files with their area and kind, and risk with its signals (ADR 0057, ADR 0094) |
| `model-sections.ts` | the categorical colour by the first three folders |
| `model-metrics.ts` | which metrics travel and with what scale —p95, log when there is a tail— they paint |
| `model-tree.ts` | the folder tree and the collapsing of single-child chains |
| `model-dependencies.ts` | edges without duplicates and the ones the snapshot marks as cycles (ADR 0037) |
| `model-lens.ts` | which lens the map opens with and which file ends up selected |

Dependencies go one way: `model.ts` wires; `model-files` reads values through `model-metrics`; nobody looks
up. `model.ts` still re-exports the contract, so `index.ts`, `browser.ts`, colour, layout, raster and the
capture do not change a single line.

**Why this way**: `buildRenderModel` was the function the map itself flagged as its hottest block —its own
comment said so, written when it already hurt—. Splitting changes no logic: every comment that explains a
rule travels with its function, and the cost is paid once. The model is what the app, the capture and the
plugins read, and its pieces can now be read without the other six in front of you: a metric's scale sits
where it is computed, and risk sits where it renormalises when history is missing.

**Verified**: the whole suite green —**173 files and 1497 tests**— alongside `model.test.ts`, which already
pins determinism, folder collapsing, cycles, the four risk signals and the lint lens. Typecheck and lint
clean, and both the browser and the site bundle build just the same.

**Verdict**: fix.
