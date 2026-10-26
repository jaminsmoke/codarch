---
title: The scope of the analysis
date: "2026-10-23"
category: feature
verdict: adr
---

**What it was**: the repo's own test fixtures entered the map, the migration debt and `sin-ciclos`;
the CLI's `--ignore` was ephemeral and `serve` and the action did not share it.

**Decision**: [ADR 0038](../../adr/0031-0040/0038-el-alcance-del-analisis.md). `.codarch.yml` gains
`ignore`, a list of `.gitignore` patterns applied **before** the snapshot is created. There is no
default exclusion for tests or fixtures: each repo declares its scope. `analyze`, `serve`, the
action and the in-browser analysis use it; `diff`, `render`, `inspect` and the MCP consume the
snapshot without filtering again.

**Verdict**: **ADR 0038**, done; it applies in M2 and M5 and opens no new phase. CLI, server,
action and in-browser analysis share the scope.
