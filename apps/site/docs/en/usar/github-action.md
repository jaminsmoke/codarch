---
title: "GitHub Action"
description: "The architecture map and diff on every pull request, in warning or blocking mode."
section: producto
sidebar:
  label: "GitHub Action"
  order: 60
---

The action analyses the base and head of each pull request, uploads the map and the report as an
artifact and leaves a comment with the architecture diff. Decisions:
[ADR 0012](../adr/0011-0020/0012-github-action.md) and [ADR 0015](../adr/0011-0020/0015-accion-publica-separada.md)
(today it is used through a subpath of the monorepo).

## Usage

`.github/workflows/codarch.yml`:

```yaml
name: CodArch
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  codarch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }
      - uses: jaminsmoke/codarch/apps/github-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on: none
```

- `fetch-depth: 0` is required: the base is computed from the merge-base and analysed in a `git worktree`.
- The action installs `codarch` from npm; it does not need CodArch's code nor run `npm ci` on your
  project. The version is pinned with `version`.

## What it produces

- **One comment, updated**: it carries the `<!-- codarch-report -->` marker; each push edits the same
  comment instead of creating another.
- **An artifact** (`codarch`): the base and head snapshots, the head map and `report.json`.

> 📸 **Pending screenshot (action-comentario):** the CodArch comment on a test PR with a
> `domain → infra` violation, with the diff table and the artifact link visible.

## Warn or block

| `fail-on` | Blocks when |
|---|---|
| `none` (default) | never: it comments and uploads the artifact |
| `violations` | there are new [`.codarch.yml`](../rules.md) violations |
| `cycles` | new cycles appear |
| `hotspots` | new hotspots appear |
| `any` | any of the above |

Only what the PR **introduces** blocks. Exit code `2`: policy broken; `1`: analysis or configuration
error. Each rule's severity (`info`/`warn`/`error`) is decided in `.codarch.yml`.

## Inputs

`github-token`, `base-ref`, `base-sha`, `fail-on`, `config` (default `.codarch.yml`; `none` disables
it), `comment`, `artifact-name`, `node-version`, `version`, `working-directory`, `title` and `top`. The
full list with defaults is in `apps/github-action/action.yml`.

## Forks

On PRs from forks the token is usually read-only: the comment is skipped with a warning, but the
analysis and the artifact still work.
