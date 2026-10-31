---
title: "MCP shares aggregation and brings lint"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**What it was**: the MCP summed size and took max complexity and risk in
`store-folders.ts`, apart from the sheet. `explain_module` did not return lint
debt for the scope, even though the artifact was already read in `get_lint_report`.

**What changes**: `aggregateFolder` lives in `@codarch/metrics` (index and browser).
The MCP indexes the tree and calls the helper; the UI reuses its maxima (and
owners) for Risk and Complexity. The MCP aggregation copy is deleted.
`explain_module` gains `lint: LintTotals | null` (`null` = not measured). No owners
in the MCP output. M66 closes.

**Why this way**: one tested helper keeps UI and MCP aligned; additive lint does
not break clients, and `null` distinguishes “not measured” from “clean”.

**Verified**: `aggregateFolder` tests (equivalence with the legacy aggregation),
metrics sheet tests, and MCP tests (identical figures and the `lint` field);
typecheck and lint for the change.

**Verdict**: done. M63 still has frontier and cycles, and scoped changes. M64 still
has the rest’s rules. M65 stays open. M66 closes.