---
title: "Web app"
description: "The map in the browser: it comes with the CLI and opens with codarch serve, or on its own with Docker."
section: usar
sidebar:
  label: "Web app"
  order: 40
---

The web app is the map in the browser: the treemap, the VISTA panel with its ÁREA and COLOR
selectors, and the inspector with its Fichero and Cambios tabs. **It does not analyse on its own in
the browser**: it analyses through `codarch serve`, which reads the repository from disk and hands it
the snapshot.

:::note
The interface is in Spanish. This page uses the names exactly as they appear on screen.
:::

## Two ways to open it

### With the CLI (the same installation)

`npm i -g codarch` already brings the web app. It opens with:

```bash
codarch serve .
```

`serve` is not another way to install: it serves the web app that ships with the CLI, locally, and
re-analyses on save. Its version is the CLI's. See [`codarch serve`](cli/serve.md).

### On its own, with Docker

Without installing Node, with the published image and your repo mounted read-only:

```bash
docker run --rm -p 127.0.0.1:4173:4173 \
  -v "$PWD":/workspace:ro \
  ghcr.io/jaminsmoke/codarch-web:latest
```

Open `http://localhost:4173`. Inside runs the same `codarch serve` over `/workspace`; the container
listens on loopback only and never writes to the repo.

If you have cloned the CodArch repository, you can also build and start it from there:

```bash
docker compose up --build
CODARCH_REPO=/path/to/repo docker compose up --build   # to look at another repo
```

![The web app at http://localhost:4173 served by the ghcr.io/jaminsmoke/codarch-web:latest container with a repo mounted](../../images/webapp-docker.png)

## The map: ÁREA and COLOR

Each block is a folder or a file. There is no «lenses» menu: they are the two selectors of the
**VISTA** panel, on the left.

- **ÁREA** decides the size of each block (the metric).
- **COLOR** decides how it is painted: Riesgo (risk), Estructura (structure), Color (commits), Estado
  de migración (migration status), Deuda de migración (migration debt), among others. When a repo
  opens, the default lens is Deuda de migración.

The layers icon, in the tool bar on the left, folds that panel away and leaves the map full screen; the
app remembers whether it was folded.

![The VISTA panel with the ÁREA and COLOR selectors and the map painted with the chosen lens](../../images/webapp-mapa-lentes.png)

With the dark theme the paper drops and the tiles keep their colour: the map still reads the same
(see [Ajustes › General](#ajustes--general)).

![The same map with the dark theme: dark paper and tiles with the lens colour](../../images/webapp-mapa-lentes-oscuro.png)

## The map's path

The path is always above the map. With no folder focused it says **Todo** (all) only, which is where
you are; once you are inside a folder, every segment becomes a button: `Todo / packages / ui`. A
click on a segment **selects** that folder —its ficha appears in the right panel without moving the
zoom— and a **double click** enters it; **Todo** selects the whole map. The arrow goes up one level
and `Esc` and backspace clear the view. The path navigates the map, it does not describe the project,
and that is why it lives here and not in the band above.

In the map, a click **selects** what the cell holds —a file or a folder— and a **double click**
enters: the file opens its code, the folder zooms. With the keyboard, `Enter` enters and `Space`
selects. The selected folder goes in the URL with the `sel` key; the file, with `file`.

**Double-clicking** a file's block gives the map's place to the whole file, read-only: the path
becomes `Todo / packages / ui / useCodarchApp.tsx` and any segment —or `Esc`, or the **← Mapa**
button in the header— brings the map back. There is no tab and no separate view, and the file stays
selected in the sheet. The open file goes in the URL with the `code` key, so a shared link opens that
code directly.

## ABRIR REPOSITORIO O ARCHIVO

This is the main way to open a repository, here and in the [desktop app](escritorio.md). The
**ABRIR REPOSITORIO O ARCHIVO** (open repository or file) header button opens a drop-down with these
options:

- **Monitorizar carpeta (live)…**: analyses the folder and analyses again on save.
- **Carpeta con .codarch…**: opens what is already in a repo's `.codarch/` folder.
- **Analizar carpeta aquí…**: analyses a folder once.
- **Archivo cc.json…**: opens a standalone snapshot.
- **Copiar enlace de la vista**: copies the URL with the current view.

Below it are the **SNAPSHOT POR URL** and **REPORTE POR URL (OPCIONAL)** fields, with the
**CARGAR POR URL** button.

In the desktop app the same button offers **Analizar carpeta…**, **Archivo cc.json…** and **Reporte
JSON…**. Only there are there also keyboard shortcuts (`Ctrl+O`, `Ctrl+Shift+O`) and the option to
pass the path as an argument on start (see [Desktop app](escritorio.md#elige-la-carpeta-del-repositorio)).

## Inspector › Fichero

The inspector is the right-hand panel and has three entries in its activity bar: **Fichero** (file),
**Carpeta** (folder) and **Cambios** (changes). Clicking a file, **Fichero** shows its metrics, its
symbols and its incoming and outgoing dependencies. Clicking a folder, **Carpeta** shows how many
files it holds, at what depth it sits and what share of its area each child takes, in the map's own
order; selecting a file goes back to **Fichero**.

![The inspector on the Fichero tab with the metrics and symbols of the selected file](../../images/webapp-inspector-fichero.png)

## Inspector › Carpeta

**Carpeta** is the sheet of the selected folder: its path, its files, its depth and its content, with
the share of the area each child takes and the files it holds. Clicking a child selects it —if it is
a file, it moves to **Fichero**. The folder's aggregated metrics, its dependency frontier and its
cycles are on this phase's roadmap.

## Inspector › Cambios

The **Cambios** (changes) tab shows what has changed: what was touched since the last commit and, if
a report was loaded, the modified and deleted files with their rules.

![The Cambios tab with an uncommitted change in the working tree](../../images/webapp-inspector-cambios.png)

## Comparing two versions: REPORTE POR URL

There is no dedicated PR or diff view. To compare two versions:

1. Generate the report with the CLI:

   ```bash
   codarch diff base.cc.json head.cc.json -o reporte.json
   ```

2. Load the head snapshot in **SNAPSHOT POR URL** and the report in **REPORTE POR URL (OPCIONAL)**,
   and press **CARGAR POR URL**.

The result shows in the inspector's **Cambios** tab, with the modified and deleted files. See
[`codarch diff`](cli/diff.md).

![The Cambios tab with the report comparing express 4.x with express 5.x](../../images/webapp-pr-diff.png)

## Histórico del repo

There is no separate history view either. Inside the **Cambios** tab, the **Histórico del repo**
(repo history) section shows **MÁS TOCADOS** (most touched) and **FOTOS GUARDADAS** (saved
snapshots). It is generated with:

```bash
codarch analyze --history
```

![The Histórico del repo section with MÁS TOCADOS and FOTOS GUARDADAS](../../images/webapp-historial.png)

## Ajustes

The gear at the foot of the tool bar —the strip of icons to the left of the map— opens **Ajustes**
(settings), with its sections General, Vista, Proyecto, Plugins, Addons, Actualizaciones, Componentes
and Diagnóstico.

![Ajustes with its sections and General open](../../images/webapp-ajustes.png)

## Ajustes › General

**General** picks the app's theme: **Claro**, **Oscuro** or **El sistema**. It is a preference of this
machine —it does not travel in `.codarch/` and does not change the analysis— and the map's tiles keep
their colours: what changes is the paper.

![Ajustes › General with the light theme and the three options](../../images/webapp-ajustes.png)

![Ajustes › General with the dark theme](../../images/webapp-ajustes-oscuro.png)

## Ajustes › Plugins and Ajustes › Addons

There is no plugin store or catalogue. **Ajustes › Plugins** lists the installed plugins and lets you
turn them on or off (for example, «Vista 3D»). The addons declared by the repo's `.codarch.yml` are in
the separate **Ajustes › Addons** section. See [Rules](reglas.md).

![Ajustes › Plugins with «Vista 3D 0.2.0» turned off](../../images/webapp-plugins.png)

## What it stores

Preferences (area metric, colour mode) live in the browser; the repo state, in its `.codarch/`
folder. The web app uploads nothing to any server.

## A static map

`codarch render <snapshot> -o <folder>` publishes the same interface as a static site with the
snapshot in `data/`: it can be served from Pages or any folder. See [`codarch render`](cli/render.md).

:::note[Learn more]
The decisions behind this page: [ADR 0044 — La app web en un contenedor local](../desarrollo/adr/0041-0050/0044-la-web-en-docker.md).
:::
