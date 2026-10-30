---
title: "Risk counts lint"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: lint already travelled to the app, but risk was still the old one: complexity, churn and size. The artifact could be read and it changed not a single colour.

**What changes**: `@codarch/metrics` gains `lintScore` (errors + ¼ warnings), `lintScores` and a fourth signal in `riskBreakdown`. **With an artifact**, the weights become 0.40 · 0.256 · 0.144 · 0.20 even when lint is clean: having measured is what gives the 20 %, not the debt it holds. **Without an artifact**, they go back to 0.50 · 0.32 · 0.18, exactly the old count. The signal is normalised by the project's p95 like the others, and the breakdown carries it in `parts.lint` with its value, its p95, its weight and its share. The render accepts the artifact (`RenderOptions.lint`), passes it to the model, and every `RenderFile` gains its weighted `lint`. The capture takes it through `ShotOptions.lint`, and `codarch shot` looks for it beside the `cc.json` — also in `.codarch/lint.json` when the snapshot sits at the root — just like `render`. The file ficha always shows the fourth bar: **Lint** with its 20 % when measured, and **unmeasured** when not, with the note saying what it will weigh. The weights in the note come from the model itself instead of being hard-coded. This repo now declares its two tools in `.codarch.yml`, so its own map counts lint.

**Why this way**: without an artifact the map cannot change: not a weight moves (there is a test). With a clean artifact lint enters at zero and its 20 % comes out of the other signals' share, the only reading that does not leave the reader guessing what was measured. And the count lives only once in `metrics`, so the app, the render and the capture cannot disagree. The artifact reader still returns `null` when it cannot understand it: that is "unmeasured", not "clean".

**Verified**: new tests for the weights with and without an artifact, an error worth four warnings, normalisation by p95, the file with findings whose risk goes up, the clean artifact that lowers risk because lint weighs at zero, the capture that changes pixels with debt and with an empty artifact but not with a broken one, `shot` reading the root `lint.json` and the one beside it, and the breakdown's HTML with the **Lint** row — "unmeasured" or its 20 %. Full suite (1,194), lint and typecheck green.

**What is missing**: the file and folder fichas with their aggregation, the Linter lens and lint in the MCP.

**Verdict**: phase in progress.
