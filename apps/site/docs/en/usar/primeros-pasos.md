---
title: "Getting started"
description: "From the first analysis to the map in five minutes: analyse, open the web app and read the result."
section: producto
sidebar:
  label: "Getting started"
  order: 15
---

This page assumes CodArch is already installed through one of its three paths (see
[Installation](instalacion.md)). The examples use the CLI; with Docker or the desktop app the result
is the same `cc.json`, with the same checksum.

## 1. Analyse your repository

From the project root:

```bash
codarch analyze .
```

It writes the snapshot to `.codarch/snapshot.cc.json`: the file and folder tree, the metrics, the
dependency graph and, when there is git, the history. See [`codarch analyze`](cli/analyze.md).

## 2. Open the web app

```bash
codarch serve .
```

The web app ships inside the CLI: `serve` installs nothing, it serves it locally, analyses the repo
and analyses again on save. See [Web app](webapp.md) and [`codarch serve`](cli/serve.md).

> 📸 **Pending screenshot (primeros-pasos-mapa):** the web app freshly opened with `codarch serve .`
> on the CodArch repo, **Risk** lens, nothing selected.

## 3. Read the map

- Each block is a folder or a file; the area is the chosen metric and the colour, the lens.
- Clicking a file opens the **inspector**: metrics, symbols and incoming and outgoing dependencies.
- Search finds files and symbols by name.

> 📸 **Pending screenshot (primeros-pasos-inspector):** the same map with a file selected and the
> inspector open on its card, with the symbol list visible.

## 4. Next steps

- Write a policy in [`.codarch.yml`](../rules.md) and check it with [`codarch diff`](cli/diff.md).
- Put the map on every pull request with the [GitHub Action](github-action.md).
- Let your agent ask about the architecture with the [MCP](../mcp.md).
