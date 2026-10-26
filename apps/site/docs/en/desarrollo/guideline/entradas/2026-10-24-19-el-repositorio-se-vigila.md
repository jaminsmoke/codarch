---
title: The repository is watched in both apps
date: "2026-10-24"
category: feature
verdict: fase
---

**What it is**: a single repository watcher, built on chokidar, for `codarch serve` and the desktop
app; and showing the stored snapshot the moment a repo is opened while it re-analyzes behind.

**Why**: the web already refreshed itself with `--watch`, but every place had its own way of
watching (and the desktop had none): different exclusion lists, per-platform watchers and nowhere to
see whether the map was up to date.

**What changed**: `watchRepository` in `@codarch/parsers` watches the root, groups bursts and skips
`.git`, `node_modules`, `.codarch/`, `.codarch-history/` and output folders. `serve` uses it and the
desktop app does too: it starts watching when it analyzes or restores, re-analyzes on save and only
rewrites `.codarch/` when the checksum changed; the map gets the new snapshot and the header says
`live`. When opening a repo that already had state, the stored snapshot shows first and the real
analysis arrives a few hundred milliseconds later: changes made without the app are reflected before
going live.

**Verdict**: **M34 phase**, in the roadmap of
[ADR 0050](../../adr/0041-0050/0050-el-repositorio-guarda-su-estado.md). Whether the desktop can
pause watching from the settings, like the web, is still open.
