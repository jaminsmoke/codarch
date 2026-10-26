---
title: "Desktop app"
description: "Installers for Windows and Linux: the same map, analysing with git against the disk."
section: usar
sidebar:
  label: "Desktop app"
  order: 50
---

The desktop app is CodArch in a native window (Electron). It analyses with the same engine as the
CLI, so the snapshot has the same checksum, but it does so against the real disk and with git: the
snapshot carries churn and there are no browser limits.

## Install

Download your system's installer from the
[repository Releases](https://github.com/jaminsmoke/codarch/releases):

| System | File | What it does |
|---|---|---|
| Windows | `codarch-<version>-setup.exe` (NSIS) | per-user install in `%LOCALAPPDATA%\Programs\CodArch`, no administrator needed |
| Linux | `codarch-<version>-amd64.deb` | installs the app system-wide, with its menu entry |
| Linux | `codarch-<version>-x64.AppImage` | runs without installing anything (`chmod +x` and open) |

macOS is not published: without signing or notarisation, Gatekeeper blocks the app. The installers
are **unsigned**; see the [FAQ](faq.md#windows-or-linux-warn-that-the-installer-is-not-signed).

> 📸 **Pending screenshot (escritorio-release):** the latest release page on GitHub with the asset
> list (`.exe`, `.deb`, `.AppImage`) visible.

## What it adds over the web app

- **Native dialogs** to pick a folder or a file.
- **Native menu and shortcuts**: `Ctrl+O` analyses a folder, `Ctrl+Shift+O` opens a JSON.
- **"Open with"**: opening a folder, a `cc.json` or a `report.json` from the file explorer analyses
  and shows it.
- The repo state is saved in its `.codarch/` folder.

> 📸 **Pending screenshot (escritorio-mapa):** the desktop app on Windows right after analysing a
> folder with `Ctrl+O`, the map drawn and the **File** menu open.

## Updating

The app looks for new versions in the Releases and updates itself. The AppImage does it without
permissions; the `.deb` asks for the administrator password, like any package. See
[Updates](updates.md).
