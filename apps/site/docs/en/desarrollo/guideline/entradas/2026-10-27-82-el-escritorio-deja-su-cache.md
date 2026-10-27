---
title: The desktop leaves its cache behind
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: `serve` and the desktop already read their scopes' caches, but the desktop did not leave its own: closing the app threw away the session's parse work, so reopening a project parsed again everything an `analyze` had not saved before (ADR 0089).

**What it is**: when the desktop analyzes —on opening a project, on pressing analyze and on every live re-analysis— that pass's cache lands in the repo's `.codarch/parse-cache.json`, next to the snapshot. From there the next analysis finds it: its own, `serve`'s or `codarch analyze`'s. The write does not wait on the snapshot: it is saved even when the snapshot was already on disk, because the parse work is new even if the map does not change.

**Why this way**: the `utilityProcess` that analyzes **does not touch `.codarch/`** (ADR 0050): it computes the cache and hands it back, and the main process writes it, being the only one that writes the repo's state. That way the invariant is not bent even for a cache. A write failure stays a `console.error`: the cache is derived, it can be deleted, and the only cost is parsing again. The file is serialized by the same code on all three platforms (`writeParseCachePayload`), with the same format and the same guards for format, parser and root.

**How it is checked**: `apps/desktop/test/analyze-worker.test.ts` analyzes a real repo with the worker, checks that **no `.codarch/` has appeared**, that the cache it returns covers the repo's files —with its root and its format— and that the checksum is the same in all three states: without a cache, with the cache saved and after deleting it. What is left without test coverage is the main process's wiring (calling the save on open, on analyze and on re-analysis): it lives in `main.ts` and is covered by the typecheck, not by the suite.

**Verdict**: ADR 0089, inside M34. It closes the gap the entry *Serve and the desktop read their scopes* left open.
