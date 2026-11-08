---
title: "Lint coverage is 1.3"
date: "2026-11-06"
category: "feature"
verdict: "adr"
---

**What it was**: `summary.measured` was a loose number, and a clean file left no trace that it had been looked at.

**What changes**: the artifact goes up to **1.3** ([ADR 0107](/en/desarrollo/adr/0101-0110/0107-la-cobertura-del-lint/)). `coverage` says what was looked at, `files` holds findings only, and `scopeHealth` reads the scope. A 1.0–1.2 file is read as `unknown` with `legacy-global`. The contract, with one example per state, is in [artifact 1.3](/en/desarrollo/lint-1.3/).

**Why this way**: without a universe, zero findings cannot be called clean. ESLint and Checkstyle do not provide it; documents do, and they are counted per document, not per rule.

**Verified**: `scopeHealth` for the four states and the codes, 1.0–1.2 reads, ESLint keeping a clean file in coverage, Checkstyle, unknown oxlint, CLI, MCP, and the rest.

**Verdict**: done. The UI is not part of this delivery.
