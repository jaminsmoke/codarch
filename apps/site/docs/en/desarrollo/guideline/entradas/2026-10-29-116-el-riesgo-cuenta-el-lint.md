---
title: "Risk counts lint"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: lint already travelled to the app, but risk was still the old one: complexity, churn and size. The artifact could be read and it changed not a single colour.

**What changes**: `@codarch/metrics` gains `lintScore` (errors + ¼ warnings), `lintScores` and a fourth signal in `riskBreakdown`. With measured debt, the weights become 0.40 · 0.256 · 0.144 · 0.20; without it, they go back to 0.50 · 0.32 · 0.18, exactly the old count. The signal is normalised by the project's p95 like the others, and the breakdown carries it in `parts.lint` with its value, its p95, its weight and its share. The render accepts the artifact (`RenderOptions.lint`), passes it to the model, and every `RenderFile` gains its weighted `lint`. The capture takes it through `ShotOptions.lint`, and `codarch shot` looks for it beside the `cc.json` — also in `.codarch/lint.json` when the snapshot sits at the root — just like `render`. The file ficha shows the **Lint** bar only when it weighs, and the weights in the note come from the model itself instead of being hard-coded.

**Why this way**: lint cannot depend on a tool being installed for the map to stay the same: without an artifact, not a weight changes and not a pixel moves (there is a test). And the count lives only once in `metrics`, so the app, the render and the capture cannot disagree. The artifact reader still returns `null` when it cannot understand it: that is "unmeasured", not "clean".

**Verified**: 11 new tests — the weights with and without lint, an error worth four warnings, normalisation by p95, the file with findings whose risk goes up, the empty artifact that changes nothing, the capture that changes pixels with debt and not with a broken artifact, and `shot` reading the root `lint.json` and the one beside it. Full suite (1,187), lint and typecheck green.

**What is missing**: the file and folder fichas with their aggregation, the Linter lens and lint in the MCP.

**Verdict**: phase in progress.
