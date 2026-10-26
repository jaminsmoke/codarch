---
title: "codarch diff"
description: "Compares two snapshots and, on request, fails on new cycles, violations or hotspots."
section: producto
sidebar:
  label: "diff"
  order: 24
---

Compares two snapshots and, on request, fails on new cycles, violations or hotspots.

## Usage

```sh
codarch diff <base.cc.json[.gz]> <head.cc.json[.gz]> [options]
```

## Options

| Option | What it does |
| --- | --- |
| `-o, --out <file>` | Writes the JSON report. Without it, no file is written. |
| `--top <n>` | Hotspots in the report. Defaults to 10. |
| `--hotspot-metric <metric>` | Defaults to `maxComplexity`, then `rloc`. |
| `--config <file>` | YAML rules. Defaults to `.codarch.yml` when present. |
| `--no-config` | Loads no rules. |
| `--fail-on <mode>` | `none` · `cycles` · `violations` · `hotspots` · `any`. Defaults to `none`. |
| `-h, --help` | Help. |

## Output

Prints the summary of the change from base to head (files, introduced cycles, hotspots, rule violations). With `-o` it writes the `report.json` read by the webapp, the MCP server and the GitHub Action.

## Examples

```sh
codarch diff base.cc.json head.cc.json -o report.json --fail-on cycles
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Compared, and the gate (if any) passed. |
| `1` | Not exactly two snapshots, an invalid snapshot, or an invalid option or `.codarch.yml`. |
| `2` | Gate failed: the `--fail-on` mode found new cycles, hotspots or new violations. |
