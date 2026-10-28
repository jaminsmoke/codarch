---
title: "Getting started"
description: "From the first analysis to the map in five minutes: analyse, open the web app and read the result."
section: usar
sidebar:
  label: "Getting started"
  order: 15
---

![The web app freshly opened: the default lens, Deuda de migración, and the first file selected](../../images/primeros-pasos-app.png)

This page assumes CodArch is already installed through one of its three paths (see
[Installation](instalacion.md)). The examples use the CLI; with Docker or the desktop app the result
is the same `cc.json`, with the same checksum.

## 1. Analyse your repository

From the project root:

```bash
codarch analyze .
```

It writes the snapshot to `.codarch/snapshot.cc.json`: the file and folder tree, the metrics, the
dependency graph and, when there is git, the history. It understands TypeScript/JavaScript, Java,
Python, Go and C#; the detail is in [what it analyses](cli/analyze.md#what-it-analyses). See
[`codarch analyze`](cli/analyze.md).

## 2. Open the web app

```bash
codarch serve .
```

The web app ships inside the CLI: `serve` installs nothing, it serves it locally, analyses the repo
and analyses again on save. See [Web app](webapp.md) and [`codarch serve`](cli/serve.md).

To open another repository, in the web app or the desktop app:

1. **ABRIR REPOSITORIO O ARCHIVO**, in the header: opens a drop-down with **Analizar carpeta…**,
   **Archivo cc.json…** and **Reporte JSON…** (for the web app's options, see
   [Web app](webapp.md#abrir-repositorio-o-archivo)).
2. Desktop only: `Ctrl+O` analyses a folder and `Ctrl+Shift+O` opens a JSON.
3. Desktop only: pass the path as an argument on start (see
   [Desktop app](escritorio.md#elige-la-carpeta-del-repositorio)).

![The web app freshly opened with codarch serve on the CodArch repo, Risk lens, nothing selected](../../images/primeros-pasos-mapa.png)

## 3. Read the map

- Each block is a folder or a file. Size and colour are chosen with the **ÁREA** and **COLOR**
  selectors of the **VISTA** panel; on opening, the colour is Deuda de migración (migration debt).
- Clicking a file, the right-hand **inspector** shows it on its **Fichero** (file) tab: metrics,
  symbols and incoming and outgoing dependencies.
- Search finds files and symbols by name.

![The map with a file selected and the inspector open on its card, with the symbol list](../../images/primeros-pasos-inspector.png)

## 4. Next steps

- Write a policy in [`.codarch.yml`](reglas.md) and check it with [`codarch diff`](cli/diff.md).
- Put the map on every pull request with the [GitHub Action](github-action.md).
- Let your agent ask about the architecture with the [MCP](mcp.md).
