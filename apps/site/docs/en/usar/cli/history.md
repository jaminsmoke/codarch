---
title: "codarch history"
description: "Lists the repository's saved snapshots and compares two of them."
section: usar
sidebar:
  label: "history"
  order: 26
---

Lists the repository's saved snapshots and compares two of them.

## Usage

```sh
codarch history [path] [options]
```

## Options

| Option | What it does |
| --- | --- |
| `--from <snapshot>` | Base snapshot: part of its date or the start of its checksum. |
| `--to <snapshot>` | Snapshot to compare against. |
| `-o, --out <file>` | Writes the diff JSON report (with `--from`/`--to`). |
| `--json` | Machine-readable output. |
| `-h, --help` | Help. |

## Output

Snapshots are saved with `codarch analyze . --history` into `.codarch-history/`. Without `--from`/`--to` it prints a table (date, files, rloc, heat, checksum) and the most-touched files of the latest snapshot; with `--json`, the full index. With `--from` and `--to` it compares both snapshots like `diff`.

## Examples

```sh
codarch analyze . --history
codarch history
codarch history --from 2026-10-01 --to 0dca58ac -o report.json
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Listed or compared (also when there are no snapshots). |
| `1` | Missing folder, snapshot not found or invalid option. |
