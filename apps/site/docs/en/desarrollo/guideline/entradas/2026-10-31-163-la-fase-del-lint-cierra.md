---
title: "The lint phase closes"
date: "2026-10-31"
category: "docs"
verdict: "arreglo"
---

**What it was**: M67's roadmap had every box ticked —system detection, the 1.2 artifact, rules per
system, readers for Biome, Ruff, Checkstyle, `go vet` and .NET, and `get_lint_report` in the MCP— and the
phase was still **in progress** in the roadmap index and in `AGENTS.md`. The same review found two boxes
that were already done in another phase: M65 still asked for "other tools per language" that M67 closed,
and M66 still asked for "the Linter lens and the message list" that M65 delivered.

**What changes**: M67 is declared closed in its roadmap, in the roadmap index and in `AGENTS.md`. M65
ticks the per-language tools, which belong to M67, and M66 ticks the lens, which belongs to M65. The
lint point in the bar and the lint in `explain_module` stay open where they were.

**Why this way**: a phase's state lives in its roadmap, and a box fulfilled in another phase does not
close itself: it stays open forever in the phase that named it. Done work and pending work in the same
list hide both.

**Verified**: `get_lint_report` is registered in `apps/mcp/src/server.ts` and reads the artifact, and
`CODARCH_ENTRIES` includes `lint.repmod.json`; the five readers and their rules live in
`@codarch/lint`. Site suite green and `site:build` with the new pages.

**Verdict**: fix. M67 closes.
