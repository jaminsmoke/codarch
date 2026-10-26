---
title: The .codarch folder only holds the state
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: cleaning the `.codarch/` of this development repository. It held **752 MB**: Chromium
profiles from the runs against the real app (`chrome-cdp*`, tens of MB each), screenshots, fixtures,
fake repositories, loose scripts and a `.codarch` inside `.codarch`. What is left is **1.5 MB** with the
five files that belong there.

**Why**: `.codarch/` is not a scratch drawer. Since ADR 0048 and ADR 0050 it is the **state of the
analysed repository**, and it travels with each repo, not with the app; what belongs to the app lives in
its own installation path (the desktop's `userData`, the web's `localStorage`). It is also in
`.gitignore` (ADR 0050), so none of that was being versioned: it only filled the disk and the analysis —
every new `.codarch/` is ignored, but the 752 MB were still there.

**What stays** (what the CLI and the apps write for this repo):

| File | Written by |
|---|---|
| `snapshot.cc.json` | `codarch analyze` and the desktop |
| `map.html` | `codarch analyze` |
| `report.json` | the PR analysis |
| `preferences.json` | the repository's view (ADR 0053) |
| `chains.json` | the chain ledger, derived (ADR 0026) |

And outside `.codarch/`: `.codarch.yml` (configuration, versioned) and `.codarch-history/` (the history
snapshots, shared, ADR 0024).

**The rule**: probes and screenshots from tests go to the **system temp folder**, not into the repo. A
project's `.codarch/` holds only what the app is going to read.

**Verdict**: housekeeping fix; no ADR needed.
