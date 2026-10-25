---
title: One single analysis session
date: "2026-10-26"
category: refactor
verdict: adr
---

**What it was**: the analysis itself was not duplicated —the CLI, the desktop app and the browser share `packages/parsers`— but the flow around it was. `serve` had its `refresh`, its `analyzeState` and its `computeHeadReport`; the desktop analysis process had its own session `Map`, its `headReportFor` and its per-root report cache. Two copies of "analyse if the pulse brings something new, re-read the `.codarch.yml` scope, compare with the last commit and collect the warnings", and they had already diverged in the details: when the report is invalidated, where the cache lives, which warning shows up when git fails.

**What changed**: the flow lives in `@codarch/parsers` as `analyzeRepo` and `headReportFor`. `serve` and the desktop worker call them and drop their copies; the server still asks for the report lazily and the desktop still reuses it when the pulse brings nothing. Along the way a bug surfaced that the two copies were hiding: the comparison with HEAD never read `.codarch.yml`, so Changes could show files the map excludes; the report is now computed with the same scope as the snapshot.

**Numbers**: about a hundred lines of flow in one place; `@codarch/parsers` gains a one-way dependency on `@codarch/metrics` and the browser is unaffected, since it enters through `parsers/browser`. Neither `cc.json`, nor the checksum, nor the `report.json` format change.

**Verdict**: [ADR 0074](../../adr/0071-0080/0074-una-sola-sesion.md), done. The MCP enters through the same contract —snapshot, report and HEAD report, with HEAD winning as it does in the app— and gains the queries only the CLI had: `suggest_architecture`, `list_profiles` and `verify_history`, which reuses the snapshot already loaded instead of re-reading from disk.
