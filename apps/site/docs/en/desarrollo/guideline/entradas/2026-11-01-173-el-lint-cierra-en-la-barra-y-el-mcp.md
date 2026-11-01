---
title: "Lint closes on the bar and in the MCP"
date: "2026-11-01"
category: "feature"
verdict: "fase"
---

**What it was**: M65 still had the lint dot on the inspector bar and the fourth
risk signal in the MCP open. The sheets, the lens and `explain_module.lint` were
already there; the MCP store still scored risk with only three signals.

**What changes**: File, Folder and Project show a dot for the worst severity
present (`.lint-dot-*`, never `--rust`); the button announces the count in
Spanish. Unmeasured or clean means no dot; Changes does not absorb lint. MCP
`buildFiles` reads the artifact, applies `lintScores` and
`riskScores(..., { lint: true })`. M65 closes.

**Why this way**: the dot warns without opening the sheet, with the same visual
language as findings; the MCP shares the map’s score so the agent is not misled.

**Verified**: tests for `worstLintSeverity`, `lintBarMark`, MCP store risk with
and without an artifact; typecheck, lint and vitest for the change.

**Verdict**: done. M65 closes. M63 (folder) and M64 (rest) stay open.
