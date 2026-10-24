---
title: CodArch does not analyze the system
date: "2026-10-24"
category: security
verdict: adr
---

**What it is**: a guard that refuses to analyze a volume root, the operating system folders and the
whole home folder; and the written rule that CodArch only looks downwards.

**Why**: with the desktop watcher (M34), picking `C:\Windows` or `/usr` would have walked and watched
the whole system. Nothing stopped it and there was no rule about where to look.

**What changed**: `protectedRootReason` in `@codarch/parsers` decides whether a folder can be
analyzed; the CLI (`analyze`, `serve`) and the desktop app (analyze, restore, open with the system and
watch) check it first. The chosen folder is the ceiling: no `.codarch` or config is looked up above
it, and the watcher covers exactly that root. To decide, the real path is resolved, but the analyzed
root is not normalized or rewritten; symbolic links are not followed.

**Verdict**: **ADR 0052**, no open phase; it is a security guard.
