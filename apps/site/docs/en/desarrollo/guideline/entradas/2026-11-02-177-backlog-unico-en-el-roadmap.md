---
title: "Single backlog on the roadmap; open checkboxes out of ADRs"
date: "2026-11-02"
category: "docs"
verdict: "done"
---

**What it was**: several ADR roadmaps and the map design checklist held `- [ ]`
boxes that were not a phase. Action smoke, install/CLI pages and packaged
desktop evidence (lazy chunk and `file://`) were still open on paper although
the code already covered them. The link line (`rest.links`) stayed out of M76
with no single place to live.

**What changes**: 0066 (smoke on the subpath), 0080 (install/CLI/updates;
pending screenshots **obsolete**), 0086 and 0087 (asar with `CodeEditor-*.js`,
relative paths, `loadFile`, `whole` IPC) are verified and ticked. Remaining open
items —including Marketplace root `action.yml` and the `rest.links` lens— move
to the **Backlog** on the [roadmap](/desarrollo/roadmap/#backlog) (ES and EN
aligned). Each open ADR points to that backlog instead of loose checkboxes.
Guide and map follow the same rule.

**Why this way**: a phase is born in its ADR; what is not a phase yet must not
live scattered. The backlog links the decision and keeps a `[ ]` from looking
like unfinished work of a closed phase.

**Verified**: code review and desktop `package:dir`; `codarch-action-smoke`
workflow on `jaminsmoke/codarch/apps/github-action@v1`; packaged `codarch.exe`
start.

**Verdict**: done. Optional manual leftover: double-click in the packaged UI to
open a whole file (the `file://` path and chunk are already ready).
