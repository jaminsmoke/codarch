---
title: The desktop persists in .codarch
date: "2026-10-24"
category: feature
verdict: fase
---

**What it is**: the desktop app stopping storing the project in `localStorage` and writing
`.codarch/snapshot.cc.json` into the analyzed repo, like the web app and the CLI. That way each repo
has its own `.codarch/` and the configuration belongs to the repo, not to the CodArch installation.

**Why**: today the desktop analyzes in memory and keeps the result in `localStorage`
(`codarch.project.v1`): a single project per machine. Changing repo loses the previous one, and the
web app ("Open repository") and the CLI cannot reuse the desktop's analysis.

**Decision**: [ADR 0048](../../adr/0041-0050/0048-el-escritorio-persiste-en-codarch.md). The main
process writes the snapshot to `.codarch/` and makes sure it is in `.gitignore`. Opening a folder
with `.codarch/snapshot.cc.json` loads it without re-analyzing. `localStorage` stays only for window
preferences.

**Advantages**: one project per repo, with no loss on switching; consistency across CLI, web and
desktop; less re-analysis; full per-repo configuration.

**Verdict**: **phase M32**, in the roadmap of
[ADR 0048](../../adr/0041-0050/0048-el-escritorio-persiste-en-codarch.md).
