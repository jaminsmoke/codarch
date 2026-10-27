---
title: The parent does not reparse its children
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: [ADR 0089](../adr/0081-0090/0089-cada-alcance-lee-los-de-abajo.md) decided that a scope reads the parse work of the ones below it, with a gate: if the saving did not reach a quarter of the parse time, it would not ship. Until today only the register of which scopes exist and how they are doing was there.

**What it is**: every analysis leaves its parse cache in its `.codarch/parse-cache.json` —with format, parser and root— and the root's analysis imports the entries from the `.codarch/` folders below, reindexed with their prefix and validated by `size:mtime` version. The `parseo` line of the summary says how many files were reused: `326 reutilizados · 28 parseados · 348 de alcances de debajo`. The cache works for its own scope too: repeating `analyze .` in this repo goes from **3 018 ms to 80 ms**, with all 356 files reused.

**Why this way**: it reuses the **parse**, not the snapshot: resolution, graph, migration and checksum are always rebuilt, so the `cc.json` comes out identical byte for byte with and without caches. A cache from another format, another parser or another root is ignored whole, and an entry whose version does not match is parsed again: a stale child costs time, it never returns a false result. A parent writes its own cache and leaves the child's alone.

**How it is checked**: `apps/cli/test/parse-cache.test.ts` covers the same checksum cold and with children caches, that a stale entry is parsed again, that a foreign cache is ignored and that the child's cache is untouched after analyzing the parent. The ADR's measurement ran on a clean copy of the repo (354 files, 15 scopes analyzed as their own, no git and without the parent's own cache): **3 107 ms cold against 315 ms with the 15 scopes' caches**, 326 of 354 files reused, same checksum `ea69ba0f…`, about 592 KB of caches. The saving is **90 %**, so the gate was passed by a wide margin.

**Verdict**: ADR 0089, inside M34. Whether `serve` and the desktop also read their scopes' caches is still open.
