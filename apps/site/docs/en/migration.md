---
title: Migration plan to Rust (M4)
description: This document validates the migration lens on CodArch itself. The numbers come from codarch analyze . and change with the code; they are not a commitment, they are a snapshot…
section: construir
sidebar:
  label: Migration plan to Rust (M4)
  order: 3
---

This document validates the migration lens on CodArch itself. The numbers come from
`codarch analyze .` and change with the code; they are not a commitment, they are a snapshot for
prioritising.

## Current snapshot

| Signal | Value |
|---|---|
| Files analysed | 211 |
| TS/JS | 211 files · 33,621 rloc |
| Rust | 0 |
| WASM/Node | 0 |
| Bridges | 2 |
| FFI edges | 0 |
| Migration debt | 5,871 |

Debt is `(maxComplexity + 1) × (1 + fanIn)` per TS/JS file. It does not count lines: a large,
trivial file weighs less than a complex one with many consumers. Test fixtures no longer enter:
this repo's `.codarch.yml` excludes them with `ignore`
([ADR 0038](adr/0031-0040/0038-el-alcance-del-analisis.md)), so the snapshot measures only
production code.

## Priority by debt

| Debt | RLOC | File |
|---:|---:|---|
| 357 | 499 | `packages/render/src/model.ts` |
| 210 | 281 | `packages/parsers/src/migration.ts` |
| 195 | 682 | `packages/metrics/src/diff.ts` |
| 185 | 313 | `packages/parsers/src/analyze-core.ts` |
| 132 | 234 | `apps/cli/src/commands/compare.ts` |
| 126 | 2,588 | `apps/web/src/App.tsx` |
| 117 | 359 | `packages/schema/src/legacy.ts` |
| 112 | 732 | `apps/mcp/src/store.ts` |
| 108 | 237 | `packages/parsers/src/graph.ts` |
| 105 | 147 | `packages/versions/src/index.ts` |
| 104 | 256 | `packages/addons/src/index.ts` |
| 102 | 535 | `apps/cli/src/commands/serve.ts` |
| 90 | 1,910 | `apps/desktop/src/renderer/App.tsx` |
| 90 | 95 | `packages/metrics/src/report.ts` |
| 90 | 124 | `packages/parsers/src/walk.ts` |

## Proposed phases

1. **Pure contracts.** `schema/identity`, `schema/stats`, `schema/tree` and the data structures.
   They are deterministic code, with no I/O or tree-sitter; the first Rust crate can be validated
   against the same fixtures and checksums.
2. **Graph and metrics.** `graph`, `diff`, `risk` and `rules`. They are pure transformations over
   data; ideal for property tests and for comparing JSON byte by byte with the TS implementation.
3. **TS parser.** `parsers/walk`, `resolve` and the tree-sitter parser. It is the riskiest phase:
   import resolution, grammars and metrics. Keeping a napi boundary with the current parser allows
   migrating file by file and comparing results.
4. **Render and adapters.** The render can stay in TS or move to WASM; the CLI and MCP are thin
   adapters. They are not the priority: they change more and do not concentrate the debt.
5. **GitHub Action.** YAML and `render-comment.mjs`; do not migrate. It consumes the published CLI.

## Boundary

The natural strategy is a Rust crate with a stable API exposed through napi, and TS adapters that
replace module by module. Each replacement must compare snapshots and checksums of the same commit.
The migration lens measures the progress: `rust` goes up, `migrationDebt` goes down, and
`ffiCrossings` says how much new coupling the bridge introduces.

## Reproducing it

```bash
npm run analyze -- .
npm run inspect -- .codarch/snapshot.cc.json --metric migrationDebt --top 15
npm run render -- .codarch/snapshot.cc.json -o .codarch/sitio
```

## Limits

- Rust is measured, not parsed: there are no Rust imports or complexity in v1.
- napi edges are not observable without the generated glue; only the bridge is marked.
- This repo's test fixtures are excluded in `.codarch.yml`; they are not production debt.
- Debt prioritises; it does not estimate weeks or people.
