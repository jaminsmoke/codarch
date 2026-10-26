---
title: There is no master ledger outside the repository
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: a pass over everything CodArch stores, to confirm that each repository carries its
own state and that no master ledger of projects is left in the app's path.

**Why**: there were doubts about whether the snapshot, the chain ledger or the config also lived in
CodArch's native path. And there was a case that mixed states: opening a loose `cc.json` left
`lastRoot` pointing at the previous repo, so its history and chains were shown next to another
snapshot, and a loose report could end up written into that repo's `.codarch/`.

**What changed**: the main process stops watching and forgets the root when what is opened is a loose
file, and the adapter does not save it as a project. Tests now check that the chain ledger lives in
`<repo>/.codarch/chains.json`, the history in `<repo>/.codarch-history/`, and that the main process
writes no state into the app profile. Only the view preferences, the enabled plugins and the last
root stay in the profile: they belong to the machine, not the project.

**Verdict**: fix, within
[ADR 0050](../../adr/0041-0050/0050-el-repositorio-guarda-su-estado.md).
