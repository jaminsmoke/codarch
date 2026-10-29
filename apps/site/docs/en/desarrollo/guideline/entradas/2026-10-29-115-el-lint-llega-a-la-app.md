---
title: "Lint reaches the app"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: `codarch lint` already wrote `.codarch/lint.json`, but nobody read it: neither `serve` served it nor the web and the desktop asked for it. The artifact existed for nobody.

**What changes**: `serve` exposes `/data/lint.json` and, **after a pass with changes**, measures again with the tools the repo declares and announces `lint` over SSE so the app re-reads; if none measures, the previous artifact keeps being served and the console says so. The web loads it at boot (from the server or the saved project), when picking a folder with `.codarch/`, on refresh and on every `lint` event. The desktop reads `.codarch/lint.json` when opening a folder, when analyzing it and when restoring the session. The saved project carries it: `SavedProject` gains `lint`, and `parseSavedProject` keeps it without requiring it. The app validates it with `readLintArtifact` and, if it cannot be understood, leaves lint as `null`: **unmeasured**, which is not the same as clean.

**Why this way**: lint is an optional signal and its own file cannot bring the map down; that is why the reader returns `null` instead of throwing, like the report reader. And the server's refresh runs **after** knowing the analysis brings something new: writing `lint.json` also wakes the watcher, and launching it before that check called itself in a loop (seen while testing with a real `serve`).

**Verified**: 12 new tests: the artifact reader, the pass shared by `lint` and `serve`, the route answering 204 without a file, the web boot from server and from saved project, and a folder with and without `lint.json`. By hand, with a real `serve` over a repo whose tool emits JSON: `/data/lint.json` answers 204 at first, an edit produces `event: update` and then `event: lint`, and the artifact is served and stable (no loop). Full suite (1,177), lint and typecheck green.

**What is missing**: the fourth risk signal, the file and folder fichas with their aggregation, and the Linter lens.

**Verdict**: phase in progress.
