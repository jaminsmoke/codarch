---
title: "Desktop app"
description: "Installers for Windows and Linux: the same map, analysing with git against the disk."
section: usar
sidebar:
  label: "Desktop app"
  order: 41
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
| Linux | `codarch-<version>-x86_64.AppImage` | runs without installing anything (`chmod +x` and open) |

macOS is not published: without signing or notarisation, Gatekeeper blocks the app. The installers
are **unsigned**; see the [FAQ](preguntas-frecuentes.md#windows-or-linux-warn-that-the-installer-is-not-signed).

![The v0.3.37 release on GitHub with its installers: .deb, setup.exe and AppImage](../../images/escritorio-release.png)

## The window

The window shows the same interface as the [web app](webapp.md): the VISTA panel, the map and the
inspector. The interface is in Spanish; this page uses the names as they appear on screen.

![The desktop app with a repo open](../../images/escritorio-ventana.png)

## Archivo, Edición, Ver and Ayuda menus

On top of the interface, the app has native menus: **Archivo** (file), **Edición** (edit), **Ver**
(view) and **Ayuda** (help).

![The native menu bar with the Archivo menu open](../../images/escritorio-menus.png)

## Elige la carpeta del repositorio

To analyse a repo, open it from the Archivo menu or from **ABRIR REPOSITORIO O ARCHIVO**. The native
**Elige la carpeta del repositorio** (choose the repository folder) dialog opens.

- **Shortcuts**: `Ctrl+O` analyses a folder, `Ctrl+Shift+O` opens a JSON.
- **A path on start**: the app accepts a folder, a `cc.json` or a `report.json` as an argument and
  opens it right after starting. The installers do not register file associations, so the app does
  not show up in «Open with» on its own: pick it by hand in that file-explorer menu or pass it the
  path from a terminal (`/opt/CodArch/codarch /path/to/repo` with the `.deb`,
  `./codarch-<version>-x86_64.AppImage /path/to/repo` with the AppImage).

![The «Elige la carpeta del repositorio» dialog](../../images/escritorio-abrir-carpeta.png)

![The desktop app on Linux after analysing a folder, with the map drawn and the File menu open](../../images/escritorio-mapa.png)

## The .codarch/ folder

The repo state is saved in its `.codarch/` folder, not in the app. What CodArch writes there:

| File | What it is |
|---|---|
| `snapshot.cc.json` | the latest snapshot |
| `head-report.json` | what was touched since the last commit |
| `report.json` | a diff report, only if one was loaded |
| `chains.json` | the symbol chain ledger |
| `preferences.json` | the view preferences |

History snapshots do not go here but in `.codarch-history/`, at the repo root. Neither does a static
map: [`codarch render`](cli/render.md) copies the whole web app to the folder you give it, with the
snapshot in `data/snapshot.cc.json`.

![`ls -la .codarch/` in a terminal of the example repo, with snapshot.cc.json, head-report.json, chains.json and preferences.json; the map.html also shown is a leftover in that working copy and CodArch does not write it](../../images/escritorio-codarch-carpeta.png)

## Ajustes › Actualizaciones

Updates only show up in **Ajustes › Actualizaciones** (settings › updates): it shows the installed
version and whether it is up to date. There is no banner; when a new version exists, the notice
appears in that section. The AppImage updates without permissions; the `.deb` asks for the
administrator password, like any package. See [Updates](actualizaciones.md).

![Ajustes › Actualizaciones with version 0.3.37 up to date](../../images/escritorio-actualizaciones.png)
