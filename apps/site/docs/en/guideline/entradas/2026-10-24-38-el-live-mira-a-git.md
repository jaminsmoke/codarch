---
title: Live looks at git
date: "2026-10-24"
category: feature
verdict: adr
---

**What it was**: live re-analysed the whole repo on every save and opened one watch handle per folder.
Saving a file cost 2,819 ms in this repo (2,194 ms of it just re-reading and parsing what had not
changed) and a mid-sized repo left hundreds of handles open.

**What changed**: parsing is reused per file with its `size:mtime` version, and between the watcher and
the analysis there is a **pulse** that decides whether a notification changes anything: with git, `git
status --porcelain=v2` gives the exact list — renames and deletions included — and what git ignores does
not count; without git, the versions of what the watcher reported are the source. Watching is down to
**two handles per repo**: the recursive tree and `.git`, for commits that never touch the tree.

**Numbers**: incremental analysis 81–105 ms (was 2,850), walk and `stat` ~15 ms, `git status` ~25 ms, a
save in the app ~450 ms including the burst grouping. A `git add`, building into `dist/` or saving with
no changes no longer analyses **or writes** `.codarch/snapshot.cc.json`.

**Verdict**: [ADR 0056](../../adr/0051-0060/0056-el-live-no-repite-el-analisis.md), done; it does not
open a new phase. Sharing the cache between the desktop and `serve`, and deciding whether asking git
only for the new paths pays off when a file appears or disappears, stay on its roadmap.
