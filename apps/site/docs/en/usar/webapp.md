---
title: "Web app"
description: "The map in the browser: it comes with the CLI and opens with codarch serve, or on its own with Docker."
section: producto
sidebar:
  label: "Web app"
  order: 40
---

The web app is the map in the browser: treemap, search, inspector, dependencies, PR view, history
and the structure, risk and metric lenses. **It does not analyse on its own in the browser**: it
analyses through `codarch serve`, which reads the repository from disk and hands it the snapshot.

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
listens on loopback only and never writes to the repo (ADR 0044).

If you have cloned the CodArch repository, you can also build and start it from there:

```bash
docker compose up --build
CODARCH_REPO=/path/to/repo docker compose up --build   # to look at another repo
```

> 📸 **Pending screenshot (webapp-docker):** the web app at `http://localhost:4173` served by the
> `ghcr.io/jaminsmoke/codarch-web:latest` container, with a repo mounted and the **Structure** lens.

## What it stores

Preferences (area metric, colour mode) live in the browser; the repo state, in its `.codarch/`
folder. The web app uploads nothing to any server.

## A static map

`codarch render <snapshot> -o <folder>` publishes the same interface as a static site with the
snapshot in `data/`: it can be served from Pages or any folder. See [`codarch render`](cli/render.md).
