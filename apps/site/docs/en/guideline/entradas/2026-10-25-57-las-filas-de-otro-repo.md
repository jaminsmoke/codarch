---
title: Rows from another repo
date: "2026-10-25"
category: fix
verdict: arreglo
---

**What it was**: the app dragged data from the previous repository. **History** kept showing the snapshots of whichever repo you had opened before, and **Most rewritten** listed ten rows with 0 —or another project's rows— even in an empty folder, because both panels load once on mount and never ask again. The window title also stayed with the first repo's folder, and it was the folder rather than the project. In the CLI, `analyze` warned that there is no TS/JS yet exited with code 0, and called a git repo with no TS/JS files "no git". And the desktop menu said "Ctrl+Comma", which is how Electron renders the comma shortcut.

**What changed**: History and heat carry a `key` per project, so they remount when another repo is opened and ask again; the heat only lists symbols that have been rewritten at least once (churn greater than 0), which is what the list promises. The title uses the snapshot's project name —`CodArch · <project>`— with the folder as fallback, and sets `document.title` too, because some Linux window managers only honour that one. `analyze` exits with code 1 when there is no TS/JS to draw, and churn says "sin ficheros TS/JS" instead of "sin git". Settings loses its painted shortcut; `Ctrl+,` (Cmd on mac) is handled by the UI and opens the dialog in the web and the desktop app.

**Numbers**: three UI files, two desktop files and one CLI file; four new or adjusted tests (heat without zeros, title with a project name, `analyze` with exit code 1). Neither `cc.json`, nor the checksum, nor `report.json` change.

**Verdict**: fix, done. What cannot be fixed from the package: installing on Node 20 will still fail compiling `tree-sitter` —Node 22 is required— and on Linux updating depends on the `.deb`, because the AppImage is not published (ADR 0045).
