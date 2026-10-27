---
title: Serve and the desktop read their scopes
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: [ADR 0089](../adr/0081-0090/0089-cada-alcance-lee-los-de-abajo.md) already made `codarch analyze` reuse the parse work of the scopes below it, but only it: `serve` and the desktop read and parsed again the packages a `.codarch/` in a subfolder had already parsed, on every re-analysis. The previous entry left it open whether they would read it too.

**What it is**: the per-scope parse cache store has moved into the shared package (`@codarch/parsers`), and the analysis **session** —the one `serve` and the desktop's analysis process use (ADR 0074)— reads, the first time it analyzes a root, the `parse-cache.json` of its own `.codarch/` and those of the `.codarch/` folders below it, reindexed with their prefix. What is reused is the **parse**, not the snapshot: resolution, graph, migration and churn are always rebuilt, so the `cc.json` and its checksum come out identical with and without caches. The desktop also gains what it loses on closing: when a project is reopened, the cache `analyze` left behind no longer dies with the previous process.

**Why this way**: a single implementation of the store —format, parser and root as guards— so that all three platforms read the same thing and a cache does not depend on who wrote it. It is looked up **once per session**: the root does not change, and a new scope is seen in the next session. A read failure is neither propagated nor reported as a warning: without a cache the whole tree is analyzed, which is the correct result, it just costs time. And the usual rule still holds: downwards yes, upwards never.

**How it is checked**: `packages/parsers/test/repo-session.test.ts` leaves a nested scope its cache and opens a new parent session: `2 reused · 2 parsed`, and after deleting the child's `.codarch/` the checksum is the same with `0 reused`. `apps/cli/test/parse-cache.test.ts` still covers the guards (another format, another parser, another root), a stale entry and the fact that the parent does not write into the child's `.codarch/`. The saving figure is the one already in the ADR: **3 107 ms → 315 ms** (90 %). It has not been measured again for `serve` and the desktop: they use the same store and the same pipeline, so what was measured is what applies.

**Verdict**: ADR 0089, inside M34. It closes what the entry *The parent does not reparse its children* left open.
