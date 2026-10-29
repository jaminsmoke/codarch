---
title: "codarch lint"
description: "Runs the lint tools the repo declares and writes the .codarch/lint.json artifact."
section: usar
sidebar:
  label: "lint"
  order: 29
---

Runs the lint tools the repository declares and writes an artifact with what they said. Lint does not go into the snapshot: it depends on which tools you have installed and how they are configured, so it gets its own file, its own checksum and its own lifecycle.

## What it measures

`codarch lint` does not ship a linter: it launches the ones the repo declares. It understands two dialects today, and each is declared with its `format`:

| `format` | What is read |
| --- | --- |
| `eslint-json` | The file list from `eslint --format json`. |
| `oxlint-json` | The diagnostics from `oxlint --format json`, with or without the `diagnostics` wrapper. |

Both produce the same normalized message: rule, severity, line, column and text. Absolute paths are made relative to the root and paths outside the repo are dropped. If two tools say exactly the same thing about the same place, it counts once.

## Repo configuration

Tools live in the `lint:` block of `.codarch.yml`:

```yaml
lint:
  - name: eslint
    command: npx eslint . --format json
    format: eslint-json
  - name: oxlint
    command: npx oxlint --format json .
    format: oxlint-json
```

Each entry carries three things: `name` —how it appears in the artifact and the summary—, `command` —the full command, run from the repo root— and `format`. Without a `lint:` block there is nothing to measure and the command says so; a malformed block fails too, instead of guessing what was meant.

## Usage

```sh
codarch lint [path] [options]
```

## Options

| Option | What it does |
| --- | --- |
| `-o, --out <dir>` | Artifact directory. Defaults to `<path>/.codarch`. |
| `--config <file>` | YAML with the tools. Defaults to `.codarch.yml` when present. |
| `--no-config` | Does not read the tools from the YAML. |
| `--fail-on <mode>` | `never`, `errors` or `warnings`. Defaults to `never`. |
| `-h, --help` | Help. |
| `-v, --version` | Version. |

## Output

Writes `lint.json` into the output directory. If it creates `.codarch/` at the root, it adds `.codarch/` to `.gitignore`; if the directory already existed, it leaves it alone.

```json
{
  "schemaVersion": "1.0",
  "meta": { "checksum": "…", "tools": ["eslint", "oxlint"] },
  "files": {
    "src/a.ts": {
      "errors": 1,
      "warnings": 1,
      "messages": [
        { "rule": "no-var", "severity": "error", "line": 1, "column": 1, "message": "Unexpected var" }
      ]
    }
  },
  "summary": { "files": 1, "errors": 1, "warnings": 1, "messages": 2 }
}
```

Files by relative path, messages ordered by line and column, and a checksum that does not change while the tools' output does not change. **An artifact with no messages is a measured, clean repo**; no artifact at all means nobody measured, which is a different thing.

The summary reports the root, the artifact and what each tool did:

![Output of `codarch lint .` in the terminal](../../../images/cli-lint.png)

## Soft failure

Tools run in parallel and the command waits for all of them. One that is missing or crashes is reported and the others carry on: the artifact is written with what was actually measured, and only with those tools.

A linter with findings exits non-zero, and that is **not** a failure if it wrote its JSON. That is why the command does not block by default: `--fail-on errors` is what CI uses, and `--fail-on warnings` counts errors and warnings.

## Examples

```sh
codarch lint .
codarch lint . --fail-on errors
codarch lint . -o .codarch --config .codarch.yml
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Artifact written. It does not mean the code is clean: its counts say that. |
| `1` | Invalid configuration, no tool measured, the artifact could not be written, or `--fail-on` found what it looks for. |

:::note[Learn more]
The decisions behind this page: [ADR 0094 — El lint, en el mapa](../desarrollo/adr/0091-0100/0094-el-lint-en-el-mapa.md). The app already loads the artifact —at boot, on refresh and from the saved project—, and `serve` measures it again after a pass with changes; it does not paint it in the fichas or on the map yet.
:::
