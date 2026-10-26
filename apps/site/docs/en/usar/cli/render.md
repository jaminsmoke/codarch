---
title: "codarch render"
description: "Publishes the static webapp with a snapshot inside, ready to serve."
section: usar
sidebar:
  label: "render"
  order: 23
---

Publishes the static webapp with a snapshot inside, ready to serve.

## Usage

```sh
codarch render <file.cc.json[.gz]> [options]
```

## Options

| Option | What it does |
| --- | --- |
| `-o, --out <dir>` | Output folder. Defaults to next to the cc.json. |
| `-h, --help` | Help. |

## Output

Copies the webapp to the output folder with the snapshot at `data/snapshot.cc.json`. Prints the file, the output, the command to serve it (`npx serve "<output>"`), file count, project and time. Use it to publish the map on any static host.

## Examples

```sh
codarch render .codarch/snapshot.cc.json -o public
npx serve public
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | App published. |
| `1` | Missing or invalid cc.json, web build not found or the output could not be written. |
