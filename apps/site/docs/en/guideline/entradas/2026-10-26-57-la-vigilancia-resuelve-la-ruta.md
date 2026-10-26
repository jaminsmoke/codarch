---
title: The watcher resolves the path
date: "2026-10-26"
category: fix
verdict: arreglo
---

**What it was**: `codarch serve --watch` died silently when the root was under a Windows temporary path. The log only left a libuv assertion: `!_wcsnicmp(filename, dir, dirlen), file src\win\fs-event.c`. The cause: `%TEMP%` arrives as the short name (`C:\Users\JAMINS~1\…`) while recursive `fs.watch` receives events with the long name; libuv compares the event's prefix with the watched directory's, they do not match, and the process aborts. There is no way to catch that from JavaScript: the only way out is not to hand it that path.

**What changed**: `watchRepository` resolves the root with `fs.realpathSync.native` before opening any handle, so it watches the long path —and resolves links and junctions on the way—. The tree and `.git` are both watched on that same root.

**Numbers**: five lines and one `realpath`; the two handles per repo (tree and `.git`) are still two. The watching tests moved to `%TEMP%`, which is exactly where it failed, and a new one watches through a junction.

**Verdict**: a fix, no ADR: it is implementation, not a product decision. Checked with the case that crashed: root `C:\Users\JAMINS~1\…\watch-serve`, `--watch` on, one save and the reanalysis `↻`, with the server still alive. Without the fix, that same test aborts the run.
