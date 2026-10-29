---
title: "The map, in a capture"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: the map lived inside the app. To see it you had to open it —or run `codarch serve`—, and the MCP tools returned text. An agent could say that `packages/ui/src/panels.tsx` weighs a lot, but it could not look at where the bulk is or see the folder going red. The `render` SVG was no help either: an agent does not read it, and outside the page it has neither colours nor size.

**What it is**: `codarch shot` and the MCP's `map_screenshot` tool paint the map as a PNG with the area and colour you ask for. `captureMap` builds the `RenderModel` with those two and paints it using `layoutMap` and `fileFill` —the same functions the screen uses— onto a pixel canvas; there is no second layout and no second colour table. The PNG is written by hand with `zlib` (filled rectangles and one-pixel frames), with no `sharp`, `canvas` or headless browser. The image carries no text —a glyph would ask for a font and a rasteriser, and one more thing that can come out different on each machine—: the names, the colour scale and the twelve largest cells travel alongside, in the summary the CLI prints and the MCP returns as a second block. `churn` is accepted as an alias of `number_of_commits`, which is the name the app gives the heat and not a snapshot metric.

**Why like this**: the map is coloured boxes, and rasterising an SVG for that means bringing in a per-platform native dependency. The `@codarch/render` package gains a node entry (`@codarch/render/node`) because the browser has neither `zlib` nor `fs`; what is shared stays in the modules both sides already used, which is what stops the capture and the screen from painting differently.

**Two slots that rotate**: captures go to `.codarch/shots/map-1.png` and `map-2.png`. The incoming one takes the free slot; with both taken, it overwrites the **oldest** by modification time. Two and not twenty because what you want to compare against is the previous one, and a capture folder with dates in the names grows on its own and is never looked at. The name carries no date, so a capture's path does not change and a link to it keeps working. `--out` writes wherever it is told and takes no slot: whoever says where they want the file is not comparing two captures.

**How it is checked**: `packages/render/test/shot.test.ts` covers the deterministic bytes (same snapshot, area, colour and size give the same PNG), the requested size, that two colours give different images, the rejection of 4x4 and of 9000, the metric the snapshot does not have, the summary, the heat alias and the slots —fill, rotate over the oldest and never go past two—. The order of `listShots` is pinned with hand-set dates, not with the clock. On the MCP side, the test checks that the tool returns an `image/png` block with the PNG and a text block with the summary. Suite **1,086** cases and **133** files, `tsc` clean and lint with no errors.

**Verdict**: phase M62 open, with the capture working. What is left is painted labels —a bitmap font for the names— if anyone misses them, and bringing the capture to the GitHub action as an attachment on the PR comment.
