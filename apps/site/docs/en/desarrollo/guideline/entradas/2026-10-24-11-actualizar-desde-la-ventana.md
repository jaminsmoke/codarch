---
title: Update from the window
date: "2026-10-24"
category: feature
verdict: arreglo
---

**What it is**: an **Update and restart** button in **Settings → Updates** that downloads the new
version, installs it and opens the app again.

**Why**: the desktop already warned that a new version existed, but only offered the link to the
release. To update you had to download the installer again, which is exactly what automatic
updating wanted to avoid. The updater downloaded in the background and applied on exit, but nothing
could be done from the window.

**What changed**: the main process exposes `codarch:install-update`. It checks whether there is a
new version, downloads it (if not already downloaded), and calls `quitAndInstall` with restart: the
app closes, the package is applied and the new version opens. The button tells what is happening
(**Downloading…**, **Restarting…**) and, if something fails, it says so in the settings. Where the
app cannot install itself (development and macOS) the button does not appear and the link to the
release stays.

**Verdict**: **fix**, inside
[ADR 0045](../../adr/0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md) (M28).
