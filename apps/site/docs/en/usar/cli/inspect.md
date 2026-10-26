---
title: "codarch inspect"
description: "Summarises a cc.json snapshot in the terminal or as JSON."
section: usar
sidebar:
  label: "inspect"
  order: 22
---

Summarises a cc.json snapshot in the terminal or as JSON.

## Usage

```sh
codarch inspect <file.cc.json[.gz]> [options]
```

## Options

| Option | What it does |
| --- | --- |
| `--json` | Machine-readable output. |
| `--top <n>` | Files in the ranking. Defaults to 5. |
| `--metric <name>` | Ranking metric. Defaults to `rloc`. |
| `-h, --help` | Help. |
| `-v, --version` | Version. |

## Output

Reads the snapshot (`.gz` too) and shows its metadata, stats and the top N files for the metric. With `--json` it prints `{ file, meta, stats, metric, top }`.

## Examples

```sh
codarch inspect .codarch/snapshot.cc.json
codarch inspect .codarch/snapshot.cc.json --top 10 --metric maxComplexity --json
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Summary printed. |
| `1` | Missing, unreadable or invalid cc.json file, or invalid option. |
