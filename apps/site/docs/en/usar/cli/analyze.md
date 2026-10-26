---
title: "codarch analyze"
description: "Analyses a repository and writes the cc.json snapshot."
section: producto
sidebar:
  label: "analyze"
  order: 21
---

Analyses a repository and writes the cc.json snapshot.

## Usage

```sh
codarch analyze [path] [options]
```

## Options

| Option | What it does |
| --- | --- |
| `-o, --out <dir>` | Output folder. Defaults to `<path>/.codarch`. |
| `--ignore <pattern>` | Adds an exclusion to the scope. Repeatable. |
| `--config <file>` | YAML scope. Defaults to `.codarch.yml` when present. |
| `--no-config` | Does not read the YAML scope. |
| `--project <name>` | Project name in the snapshot. |
| `--no-git` | Does not read churn from git history. |
| `--history` | Also saves the snapshot to `.codarch-history/`. |
| `-h, --help` | Help. |
| `-v, --version` | Version. |

## Output

Writes `snapshot.cc.json` to the output folder. If it creates `.codarch/` at the root, it adds `.codarch/` to `.gitignore` (an existing folder is left alone). Prints a summary: root, snapshot path and size, files, folders, edges, cycles, imports (external, builtins, type-only, unresolved), migration and time.

![Output of `codarch analyze .` in the terminal](../../../images/cli-analyze.png)

## Examples

```sh
codarch analyze .
codarch analyze . -o .codarch --project "My project" --history
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Snapshot written. |
| `1` | Invalid argument or option, missing path, invalid `.codarch.yml` or the output could not be written. |
