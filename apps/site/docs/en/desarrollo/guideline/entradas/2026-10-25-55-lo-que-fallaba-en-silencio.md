---
title: What failed in silence
date: "2026-10-25"
category: fix
verdict: arreglo
---

**What it was**: the app went quiet exactly when it had to explain itself. You picked the folder in the dialog, pressed Open, and nothing happened: the menu opened the dialog and threw away the choice, and if the path did not exist, was a system folder, or the analysis crashed, the window stayed as it was. In the CLI, `analyze` with a mistyped path created the folder with a recursive `mkdir` and left an empty snapshot inside; `serve` started over a path that does not exist and served the void; `history` said "no snapshots" for a folder that is not there; `inspect` answered with an `EISDIR` to a folder and showed `commit —` because the snapshot did not store the commit; and a Python repo produced a blank map without saying the map only draws TS/JS. On Node 20, `npm i -g codarch` failed compiling `tree-sitter` and left the command broken with a native error.

**What changed**: the desktop opens what you pick —menu, Ctrl+O, "Open with" and drag all go through the same `openTarget`—, the window title names the project (`CodArch · <folder>`), the menu is in Spanish with its mnemonics (`Alt+A` opens File, "Salir" instead of "Quit") and, when something cannot be opened, a notice says why instead of silence. The dialog retries once without a parent window: some Linux portals return it closed and empty. In the CLI, the five commands check the path before touching anything and answer with the reason and exit code 1; `inspect` names what it expects when you hand it a folder; a `diff` that never compares writes no `report.json`; the snapshot carries `meta.commitHash` so `inspect` says which commit it was made on. The published binary (`bin.js`) checks the Node version before importing anything, so on Node 20 it says what is missing instead of a compile error.

**Numbers**: five commands with the same path check (one `directoryProblem`/`fileProblem` in `io.ts`). `meta.commitHash` is optional and lives outside the checksum, which depends on the code and the lenses: older snapshots stay valid. The `v1` tag stays: it is not a release, it is the reference the action uses (`@v1`); the feed already resolves the latest release by itself, so there is nothing to remove from the registry.

**Verdict**: fix, done. It remains open that installing with Node 20 still fails compiling `tree-sitter`: now it is said beforehand, but the real fix is Node 22, which `engines` already asks for.
