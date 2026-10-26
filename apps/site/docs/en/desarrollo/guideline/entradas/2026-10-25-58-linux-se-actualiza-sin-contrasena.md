---
title: Linux updates without a password
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: Linux only published the `.deb`. Installing was fine —menu entry, app in the system—, but every update goes through `dpkg`/`apt` and the administrator password, and afterwards the app cannot reopen itself. ADR 0045 had left the AppImage out with a reasonable but incomplete argument: "it is an executable, not an installer".

**What changed**: the release publishes `codarch-<version>-x64.AppImage` next to the `.deb`, and the workflow uploads its `.blockmap` too. When the app runs as an AppImage, a downloaded update asks **Restart now** or **On quit**; in the first case `quitAndInstall` writes the new binary in the user's folder and starts the new version, no permissions involved. With `.deb` nothing changes: the system applies it on quit and asks for permission. ADR 0045 is revised with a note on why the decision changed.

**Numbers**: two formats on Linux instead of one and one more artifact per release —with its `.blockmap`—; the `.deb` changes neither name nor contents. Two new tests for when the app can restart on its own (`canSelfRestart`).

**Verdict**: [ADR 0045](../../adr/0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md), done.
