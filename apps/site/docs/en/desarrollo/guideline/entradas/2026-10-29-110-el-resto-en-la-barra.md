---
title: "The rest, in the bar"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: with [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) the rest was already measured and written, but nothing loaded it: `rest.cc.json` was sitting in `.codarch/` while the app still showed a single map.

**What changes**: the web and the desktop load both artifacts from the same pass — the server serves them together, the repo folder brings its own, the browser analysis and the desktop one return it with the snapshot — and the left activity bar gains a second button: **`Docs y config`**, with the document icon. Clicking the active map's button folds the sheet, as before; clicking the other one switches the whole map and leaves its sheet open. Without `rest.cc.json` the button is shown disabled.

**Why like this**: it is not a stage tab and not a plugin view. Tabs already mean "the view a plugin brings", and this changes the model — tree, metrics, ficha and rail — so it lives in the map bar, where you choose what you are looking at. It is not split into one map per kind either: documents, configuration and assets are one single map.

**What changes inside**: the rest's area is its size and its colour is too, until colour by kind arrives; the blocks that only speak about code — languages and symbol heat — disappear from the rail, and the legend and the file ficha lean on the rest's metrics. Switching maps drops the selection, the focus and the open file, because they belong to the previous model.

**What is missing**: colour by kind with its legend, the strata grouped by `kind` and the rest file's own ficha; the rules of the rest, in their own ADR.

**Verdict**: phase under way.
