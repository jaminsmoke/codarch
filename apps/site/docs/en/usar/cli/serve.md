---
title: "codarch serve"
description: "Analyses a repository and serves the webapp locally, refreshing it when files change."
section: usar
sidebar:
  label: "serve"
  order: 25
---

Analyses a repository and serves the webapp locally, refreshing it when files change.

## Usage

```sh
codarch serve [path] [options]
```

## Options

| Option | What it does |
| --- | --- |
| `-p, --port <n>` | Local port (1–65535). Defaults to 4173. |
| `--host <host>` | Interface. Defaults to `127.0.0.1`. |
| `--watch` | Re-analyses on file changes and refreshes the app over SSE. Default. |
| `--no-watch` | Analyses only at start. |
| `--no-web` | API mode: serves `/data/*` without the app (for Vite or another frontend). |
| `-h, --help` | Help. |

## Output

Prints the URL and keeps running until Ctrl+C. Besides the app it exposes data under `/data/` (`snapshot.cc.json`, `rest.cc.json`, `lint.json`, `meta.json`, `report.json`, `head-report.json`, `history.json`, …). The rest —documents, configuration and assets— comes from the same pass as the code and is stored in `.codarch/rest.cc.json`. Lint is a separate file: whatever exists is served, and it is measured again after a pass with changes, using the tools the repo declares ([`codarch lint`](lint.md)); without a `lint:` block there is no artifact and the app simply has no lint. Without a path it analyses the current folder.

## Examples

```sh
codarch serve .
codarch serve . --port 8080 --no-watch
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Server stopped normally. |
| `1` | Invalid option, missing or disallowed path, invalid `.codarch.yml`, web build not found or the port could not be opened. |
