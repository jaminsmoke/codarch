---
title: "ADR 0109 — Lint health is read together"
description: "scopeHealthMerged joins code lint and document lint by canonical path, without rewriting the artifacts or adding documents to risk."
section: desarrollo
status: accepted
date: "2026-11-07"
sidebar:
  label: Lint health is read together
  order: 109
---

**Status:** accepted · **Date:** 2026-11-07

This **amends** the roadmap point of [ADR 0105](0105-las-reglas-de-doc-y-config.md) that painted rest findings on the Docs and config sheets. Each artifact's coverage stays the one in [ADR 0107](0107-la-cobertura-del-lint.md). Risk does not change: it still reads `scopeHealth` for each code file ([ADR 0108](0108-el-lint-suma-al-riesgo.md)).

## Context

Code is stored in `lint.repmod.json` and documents in `lint-rest.repmod.json`. Each has its own `meta.tree`. The Code card read only the first, so an empty 1.2 legacy file came out as unknown coverage and the `doc/broken-link` findings ended up in Docs and config, mixed with the catalog.

Adding the two in the interface double-counts as soon as someone adds them again. One adapter is enough.

## Decision

1. The sum lives in a pure function. It does not write artifacts, it does not change `domain`, and it does not store per-folder health.

```ts
function scopeHealthMerged(
  artifacts: readonly (LintArtifact | null)[],
  scope: HealthScope,
  snapshot?: HealthSnapshot
): MergedScopeHealth
```

2. Findings merge by canonical path. Each one keeps `domain`, `tool` and `ruleId`. If the code artifact does not say which tool wrote the message —eslint and oxlint share the file—, the tool is inferred from the `ruleId` against `meta.systems` and the finding is `inferred`. If both could have written it, it is not duplicated: `tool` joins the candidates. `anchor` names the map (`code` or `rest`) and the path, so the UI can open the node.
3. Coverage is per origin and per path. An enumerated document is `enumerated` on its `measuredPaths`. A legacy origin is `legacy` / `unknown` on its own, with reason `legacy-version` (“measured with an earlier version”). A 1.0–1.2 `summary.measured > 0` does not become `complete`. A 1.3 code artifact with ESLint enumerated and `eligiblePaths: null`, and oxlint `unknown`, stays `partial`: it is not forced to `complete`.
4. The aggregate is clean only when every domain applicable to the selection is `complete`, with `fresh === true` and zero findings. An applicable legacy or `unknown` is not clean. A domain the canonical path leaves out does not count.
5. At the project root, documents are not cut by the code snapshot's path list. In a folder and a file, the canonical path decides.
6. `meta.tree` is not merged. Each origin keeps its own and its freshness. If the snapshot is the other origin's tree, this origin's freshness stays `null`: it is not called stale and the two trees are not pretended to be one.
7. Risk does not call `scopeHealthMerged`. It still reads the code artifact.
8. Docs and config reads the catalog, not the findings. `systemActivity` derives `activeRules` and `countState` (`known-complete`, `partial` or `unknown`) from `meta.systems`. They are not written in the file. Oxlint with the note “no se enumeran” and no list is `unknown`, never zero.
9. The `codarch` system's rules come from `codarchActiveRules` in `packages/lint/src/rest.ts`: broken links always, and orphans, frontmatter and twins only when the `docs:` block turns them on. They do not come from the messages. `buildRestLint` writes them in `meta.systems[].rules`, a field that already existed.

## Checksum

The artifact checksum is still the hash of `{ domain, tools, systems, files, coverage }`. `countState`, `activeRules`, `inferred` and `anchor` are not in it: they are computed on read.

Writing `rules` on the `codarch` system does change the checksum of a newly built `lint-rest.repmod.json`, because `systems` was already part of the input. An artifact already on disk is not recomputed: `readLintArtifact` keeps the file's checksum. A system without `rules` still reads; if the list is missing, the catalog shows `codarchRuleCatalog()` and not the findings.

## Consequences

- The Code card shows health and findings from both domains, filtered by the selection. Docs and config does not show finding counts or affected files.
- A `.md` file is not a node of the code map: the analysis extensions do not include it. It is on the rest map. The finding's `anchor` points at that map. If the code card does not have the node, the button cannot select it there.
- Document freshness is not checked against the code checksum. With the two trees different, the aggregate is not called clean.

## Alternatives discarded

- **Rewrite both artifacts into one.** One `meta.tree` cannot sign two trees.
- **Add them in each panel.** The second sum does not match the first.
- **Treat a legacy file with `measured > 0` as verified.** The number does not say which paths were looked at.
- **Force 1.3 code to `complete`.** ESLint leaves the universe `null` and oxlint does not enumerate: `partial` is on purpose.
- **Store `countState` in the file.** That would add a new checksum field for a fact that comes from the note and from `rules`.

## Roadmap

No new phase.

- ✅ `scopeHealthMerged`, the catalog with `countState`, and the `codarch` rules in the producer.
- ✅ The Code card reads both origins. Docs and config stays on the catalog.

The record of what was done lives in the [guide feed](/en/desarrollo/guia/).
