---
title: "codarch-mcp"
description: "The CodArch MCP server: a separate, read-only binary over stdio."
section: producto
sidebar:
  label: "mcp"
  order: 27
---

The MCP server is **not a `codarch` subcommand**: it is a separate binary, `codarch-mcp`, that an
agent starts over stdio. It reads an already generated snapshot (from
[`codarch analyze`](/en/docs/usar/cli/analyze/)) and, if present, the diff reports. Its tools are
listed in [MCP](/en/docs/mcp/).

:::note
The `codarch` npm package installs only the `codarch` binary. Today `codarch-mcp` runs from a clone
of the repository (`apps/mcp/bin/codarch-mcp.mjs`, after `npm ci`).
:::

## Usage

```sh
node apps/mcp/bin/codarch-mcp.mjs [options]
```

## Options

| Option | What it does |
| --- | --- |
| `-s, --snapshot <file>` | cc.json snapshot. Defaults to `.codarch/snapshot.cc.json`. |
| `-r, --report <file>` | Diff `report.json`. Defaults to `.codarch/report.json`. |
| `--no-report` | Loads no report. |
| `--head-report <file>` | Working tree vs HEAD report. Defaults to `.codarch/head-report.json`; takes precedence over `--report`. |
| `--no-head-report` | Does not load that report. |
| `--root <dir>` | Project root. Defaults to the cwd. |
| `-h, --help` | Help. |
| `-v, --version` | Version. |

## Output

stdout is reserved for the MCP protocol; status messages (`codarch-mcp <version> listo: …` and
errors) go to stderr. Example MCP client configuration:

```json
{
  "command": "node",
  "args": ["/path/repo/apps/mcp/bin/codarch-mcp.mjs",
           "--root", "/path/repo",
           "--snapshot", ".codarch/snapshot.cc.json",
           "--report", ".codarch/report.json"]
}
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Help or version printed, or the server ended normally. |
| `1` | Invalid option, or the snapshot could not be loaded or the server could not start. |
