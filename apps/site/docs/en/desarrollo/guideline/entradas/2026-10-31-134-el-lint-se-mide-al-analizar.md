---
title: "Lint is measured while analysing"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**What it was**: the lint lens was not a lens of the map, it was a file that sometimes existed. Opening a `cc.json` brought no lint; `codarch analyze` did not measure it either, so the map could only be painted by debt if someone had run `codarch lint` or there was a `serve` behind it. The lint block in **Metrics** had also grown a «Paint the map» button that was not the place: lenses are chosen in **COLOUR**. With a clean repo, moreover, the scale started at the paper colour and the whole map melted into the background.

**What changes**: `codarch analyze` runs the lint the project already has —its config and its binary, ADR 0096— and writes `.codarch/lint.cc.json` signed with the checksum of the snapshot it has just written, in the same pass as the metrics. `--no-lint` skips it. `serve` and live compare that `meta.tree` with the tree they serve and do not re-measure what is already theirs. The button goes away: the lens lives in **COLOUR**, with its own scale whose clean end is a muted green, shared by the legend, the sheet and the PNG from `codarch shot`.

**Why this way**: ADR 0094 rejected lint inside `analyze` over cost, and the cost is gladly paid —eleven seconds in this repo— in exchange for debt sitting where every other lens sits. The artifact stays outside `cc.json`: the checksum depends on the code and not on what you have installed, and a lint invented by us is not worth what the project's linter is.

**Verified**: `codarch analyze` over this repo in 11.0 s writes the artifact with `tree` equal to the snapshot's and `eslint` + `oxlint`; a second `serve` over that tree launches no linter (`0 measured`, `measured: 1039`); `--no-lint` writes no artifact. Tests for lint in the analysis and in `serve`, for the clean scale and for boot without a button. Typecheck, lint and suites green.

**Verdict**: fix.
