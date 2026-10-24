---
title: The project lives in .codarch
date: "2026-10-24"
category: feature
verdict: fase
---

**What it is**: the desktop app reading the project from the repo's `.codarch/` and no longer from
`localStorage`. `localStorage` keeps the view preferences, the active plugins and the last repo's
root; the snapshot, the report and the addons come from the repository.

**Why**: even though the main process already wrote `.codarch/snapshot.cc.json`, the renderer kept
storing the project in `localStorage` (`codarch.project.v1`) and restored it from there. Writing to
the repo was of little use if on startup the local copy was read: one project per machine and the
web app unable to reuse the analysis.

**What changed**: on startup, the desktop migrates the old project to `.codarch/` once (if the repo
is still there and writable), forgets the old key and restores from the repo: the snapshot, its
`report.json` if it exists and the addons it declares. "Analyze folder" writes the snapshot again,
and opening a loose JSON does not invent a `.codarch/` next to it. In the settings, **Project**
explains that it lives in the repo and that forgetting it does not delete the directory.

**Verdict**: **phase M32, closed**, in the roadmap of
[ADR 0048](../../adr/0041-0050/0048-el-escritorio-persiste-en-codarch.md).
