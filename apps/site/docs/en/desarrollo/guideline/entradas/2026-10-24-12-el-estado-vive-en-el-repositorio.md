---
title: State lives in the repository
date: "2026-10-24"
category: feature
verdict: fase
---

**What it is**: ordering the three places where CodArch stores something from a repository
—`.codarch.yml`, `.codarch/` and `.codarch-history/`— and making the state ignored by git from the
first analysis, from the CLI too.

**Why**: the desktop already wrote `.codarch/` into the repo and added it to `.gitignore`, but the
CLI (`codarch analyze`) left those files untracked, and the desktop added the line again on every
save, so removing it was useless. On top of that, nothing said what happens when analyzing a
subfolder of a repo that already has `.codarch/`, or how the map is kept up to date.

**What changed**: `ensureGitignoreEntry` in `@codarch/parsers` is used by the CLI and the desktop,
only when `.codarch/` is born; `--out` does not touch `.gitignore` and `serve` does not write. The
anchoring rule is written down: every analyzed folder has its own state. And the map stops being a
snapshot: M34 will continue with watching the root and refreshing in the background.

**Verdict**: **phase M34**, in the roadmap of
[ADR 0050](../../adr/0041-0050/0050-el-repositorio-guarda-su-estado.md).
