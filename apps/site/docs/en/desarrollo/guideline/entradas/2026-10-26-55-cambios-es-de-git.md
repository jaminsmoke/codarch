---
title: Changes are git
date: "2026-10-26"
category: fix
verdict: adr
---

**What it was**: the Changes tab mixed things that are not a change —architecture rules, migration debt, symbols, cycles and the history of snapshots— and, worse, the data was not always current: the app asked for `data/report.json` and only replaced it with the HEAD report when one arrived. In this very repository the tab showed 65 added files from a report three days old while the tree had eight touched files. Without git there was no fallback: the history kept growing and the change list ended up being an archive, not a tab.

**What changed**: the tab shows only the working tree against its last commit. With a server it asks for a single report, the HEAD one, and the live refresh re-reads that; a static artifact —a PR's map— keeps its `report.json`, because there is no repository to compare with. Without git it says so, and without changes too. Rules leave the tab and its change count: they are not a change of the code, and each file's card already lists them. The history stays at the end, folded and with its own sentence: they are saved snapshots of the repository, not today's changes.

**Numbers**: the panel drops about a hundred lines of rules and two data paths become one; neither `cc.json`, nor the checksum, nor the `report.json` format, nor what the action publishes change. The web now asks the server for a single report.

**Verdict**: [ADR 0075](../../adr/0071-0080/0075-cambios-es-de-git.md), done. The three states were checked in the served app: with changes it lists the touched files, without git it says there is no git, and with a clean git tree it says there are no changes since the last commit.
