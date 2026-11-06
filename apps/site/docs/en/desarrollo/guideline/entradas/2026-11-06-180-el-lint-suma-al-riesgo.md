---
title: "Lint adds to risk"
date: "2026-11-06"
category: "feature"
verdict: "adr"
---

**What it was**: with an artifact, risk rescaled the base to leave 20% for lint. A file with no findings went down, and a file missing from `files` was filled with zero.

**What changes**: lint adds before gamma and does not subtract ([ADR 0108](/en/desarrollo/adr/0101-0110/0108-el-lint-suma-al-riesgo/)). `D` is errors plus a quarter of the warnings, it saturates at 10 and it can add up to 0.2. `risk` stays on 0..1 and `score` is 100 times that. The view comes from each file's `scopeHealth`. `fresh` null or false does not penalize. The formula is in [risk](/en/desarrollo/riesgo/).

**Why this way**: rescaling made a lint zero lower files that could not be called clean. Debt that was seen still raises the index when the universe is unknown: it is an observed minimum.

**What is left**: the contribution row on the card. α and Dsat are still not calibrated.

**Size**: the formula was already in metrics; this wires render, the MCP and the screenshot, with its ADR.

**Verdict**: done, except the card.
