---
title: The desktop app analyses without freezing
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: opening, starting up or re-analysing a repository in the desktop app no longer stops the
whole app. Before, while it analysed, the window did not answer clicks: click acks of 0.4 to 3.4
seconds were measured at startup and up to 5 seconds when saving a file.

**Why**: `analyzeRepository` ran **synchronously in Electron's main process** (`codarch:analyze`,
`refreshFromDisk` and `openTarget`). That process is Chromium's browser process: it not only handles
IPC, the menu and dialogs, it also dispatches input, so a 4–8 second analysis froze the app for just as
long. The web never had the problem because it analyses in a **Worker**
(`apps/web/src/analysis/client.ts`). Measured in this repository (297 files): 8.1 s of analysis with the
app unresponsive, 130–350 ms of click latency and bursts of more than 500 ms with no events delivered.
With the analysis off that thread: the main process uses 125–203 ms of CPU across the whole startup, its
worst stall drops to 23–28 ms and clicks are acked in 1 ms (median). The map takes the same time: the
analysis is not faster, it just stops getting in the way.

**What changed**:

- `analyze-worker.ts`: the analysis lives in a `utilityProcess`, with its own bundle
  (`dist/analyze-worker.cjs`) and a minimal protocol (`analyze-protocol.ts`).
- `analyzer.ts` and `pending-analyses.ts`: a client that starts the process on first use, runs **one
  analysis at a time** and groups requests by root. If the watcher fires five times during a burst of
  saves, it runs **one repeat** instead of five analyses: the repeat already sees the disk afterwards.
- `main.ts`: the three paths become `async` (`codarch:analyze`, `refreshFromDisk` and `openTarget`) and
  the helper process is closed on `before-quit`. The snapshot is still written by the main process.
- `build-main.mjs`: a third esbuild entry, sharing externals and version.

**How it was found**: the real app was measured with the Chromium debugger (click acks with
`Input.dispatchMouseEvent`, renderer long tasks and main-thread stalls with a `setInterval` sampler in
the Node inspector), and compared against the web. GPU was ruled out —ANGLE/D3D11 with the RTX, already
in use—, as were bundle size (367 KB, the same as the web), the CSS and the idle renderer, which already
ran at 8 ms per frame.

**Still open**: the `live` refresh did not fire in some runs even though the header says `live`; in the
packaged main process no active `FSWatcher` shows up. `watchRepository` works in Node against the same
repository, so the next suspect is `chokidar` inside the main process bundle.

**Verdict**: performance fix; no ADR needed.
