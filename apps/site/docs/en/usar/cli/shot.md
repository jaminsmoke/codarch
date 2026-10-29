---
title: "codarch shot"
description: "Saves the map as a PNG with the area and colour you pick, so you can see it without opening the app."
section: usar
sidebar:
  label: "shot"
  order: 28
---

Saves the map as a PNG with the area and colour you pick, so you can see it without opening the app.

## Usage

```sh
codarch shot <file.cc.json[.gz]> [options]
```

## Options

| Option | What it does |
| --- | --- |
| `--area <metric>` | Metric that decides each box's area. Defaults to `rloc`, or to the one with the widest coverage. |
| `--color <mode>` | `risk`, `structure` or a metric name (`churn` works as an alias of `number_of_commits`). Defaults to `risk`. |
| `-o, --out <file>` | Writes the PNG to that path instead of taking a slot. |
| `--width <px>` | Capture width, between 160 and 4096. Defaults to 1400. |
| `--height <px>` | Capture height, between 160 and 4096. Defaults to 900. |
| `--json` | Machine-readable output. |
| `-h, --help` | Help. |

## Output

Writes the PNG into `.codarch/shots/`. There are **two slots**, `map-1.png` and `map-2.png`: the capture takes the free one and, with both taken, overwrites the oldest by modification time. Two and not twenty because what you want to compare against is the previous one, and a capture folder with dates in the names grows on its own.

The image carries the names of the largest cells and of the folders, drawn with the package's own bitmap font: a box that has no name in the app has none here either. The colour scale and the numbers do not fit in the PNG, so the command prints the path, the slot, the area, the colour, the size and the summary with the scale and the largest cells —the same the MCP's `map_screenshot` tool returns.

An area or colour the snapshot does not have does not paint an empty map: the command fails with the message about the missing metric. The capture is deterministic: same snapshot, same area, same colour and same size give the same bytes.

## Examples

```sh
codarch shot .codarch/snapshot.cc.json
codarch shot .codarch/snapshot.cc.json --area maxComplexity --color rloc --width 2000
codarch shot .codarch/snapshot.cc.json -o map.png
codarch shot .codarch/snapshot.cc.json --color churn --json
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Capture written. |
| `1` | Missing or invalid cc.json, the area metric or the colour is not in the snapshot, or the PNG could not be written. |
