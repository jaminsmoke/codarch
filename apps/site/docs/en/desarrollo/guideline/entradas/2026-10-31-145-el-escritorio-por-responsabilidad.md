---
title: "The desktop main process, by responsibility"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: `apps/desktop/src/main.ts` had **1160 lines** and seven jobs: create the window, bridge to
the renderer, watch the repo, reanalyse, write `.codarch/`, open folders and files, the native menu, the
system dialogs, sixteen IPC handlers and updates. All with module-scope mutable state (`window`,
`lastRoot`, `repositoryWatcher`, `storedChecksums`) any function could touch. None of it could be tested
without booting Electron: the existing tests read the file as text.

**What changes**: the file is split along seams, not by size:

| Module | What it is |
|---|---|
| `main.ts` (126 lines) | the lifecycle and the wiring |
| `window.ts` | the window, the title and the sends to the renderer |
| `persistence.ts` | everything read from and written to `.codarch/` |
| `live.ts` | the watcher and the reanalyse decision (ADR 0056) |
| `targets.ts` | opening a folder or a JSON |
| `menu.ts` / `menu-template.ts` | the menu, with the template as pure data |
| `dialogs.ts` | the system dialogs |
| `ipc.ts` | the renderer's door, with its sixteen handlers |
| `updater.ts` | check, download and install |
| `session.ts` | the open root and the analysing process |

The dependency goes one way: `main` wires, the modules do not know each other beyond what they need.
`live` and `targets` receive their functions —send, notify, analyse— instead of reading globals.

**Why this way**: what cannot be tested breaks without anyone noticing. Persistence, the menu, opening a
path and the reanalyse decision do not need Electron: they now have 29 new tests with real repositories in
a temp folder and fake analysers. And `main.ts` shows at a glance which pieces exist.

**Verified**: 169 files and **1447 tests** green (they were 1418), lint with no messages, a clean
typecheck, and the main-process build (`build:main`) writing its three bundles. The menu is checked per
platform —mnemonics on Linux and Windows, app menu on macOS, accelerators and actions—, persistence
against a real `.codarch/`, and the live repo in its four decisions: nothing new, new snapshot, only the
rest changed, or nothing to do.

**Two things the split reveals**: the `codarch:analyze` handler wrote artifacts without cleaning the
folder (it now cleans, like every other pass), and a closed window left a live reference any later send
would have used (it is released on close now).

**Verdict**: fix.
