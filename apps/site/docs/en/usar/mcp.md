---
title: "MCP for agents"
description: "CodArch exposes its model to agents through a local MCP server over stdio. It does not analyse code inside MCP: it reads an already generated cc.json snapshot and,…"
section: usar
sidebar:
  label: "MCP"
  order: 51
---

CodArch exposes its model to agents through a **local MCP server over stdio**. It does not analyse
code inside MCP: it reads an already generated `cc.json` snapshot and, if it exists, the diff's
`report.json`. Everything it returns is a read of the snapshot, except `map_screenshot`, which also
leaves a PNG in the repo. That way the agent sees the same facts as the CLI, the map and the PR comment.

The server is **not a `codarch` subcommand**: it is a separate binary, `codarch-mcp`, that the agent
starts over stdio.

:::caution
The `codarch` npm package installs only the `codarch` binary. Today `codarch-mcp` runs from a clone
of the repository (`apps/mcp/bin/codarch-mcp.mjs`, after `npm ci`).
:::

## Requirements

1. A snapshot:

   ```bash
   npm run analyze -- .
   # .codarch/snapshot.cc.json
   ```

2. Optionally, a diff report:

   ```bash
   npm run diff -- base.cc.json head.cc.json -o .codarch/report.json
   ```

   In the GitHub Action, the artefacts land in
   `.codarch/action-artifacts/head/snapshot.cc.json` and `.codarch/action-artifacts/report.json`.

Without a report, the map and the metrics work; change and violation queries answer
`available: false` with a reason, instead of inventing data.

## Starting it

The launcher resolves `tsx` from the repository itself, so it can be invoked from any directory:

```bash
node apps/mcp/bin/codarch-mcp.mjs \
  --root . \
  --snapshot .codarch/snapshot.cc.json \
  --report .codarch/report.json
```

It is a stdio server: it does not print a prompt or exit. `stdout` is reserved for JSON-RPC; status
messages go to `stderr`. To see the help:

```bash
npm run mcp -- --help
```

Do not use `npm run mcp` as the MCP client command: npm can write notices to `stdout` and break the
protocol. Use the launcher with `node` or the equivalent direct command.

### Client configuration

Generic example (Claude Desktop, Cursor or another MCP client with JSON configuration). Replace
`C:/path/repo` with the absolute path of your checkout:

```json
{
  "mcpServers": {
    "codarch": {
      "command": "node",
      "args": [
        "C:/path/repo/apps/mcp/bin/codarch-mcp.mjs",
        "--root", "C:/path/repo",
        "--snapshot", ".codarch/snapshot.cc.json",
        "--report", ".codarch/report.json"
      ]
    }
  }
}
```

The `--snapshot` and `--report` paths are relative to `--root`. If the client supports `cwd`, you
can use relative paths and omit `--root`, but the launcher does not depend on it.

To skip loading a report:

```json
"args": ["C:/path/repo/apps/mcp/bin/codarch-mcp.mjs", "--root", "C:/path/repo", "--no-report"]
```

### Options

| Option | Default | Use |
|---|---|---|
| `--root <dir>` | cwd | Project root and base for relative paths |
| `-s`, `--snapshot <file>` | `.codarch/snapshot.cc.json` | `cc.json` 2.x snapshot (or normalisable 1.x) |
| `-r`, `--report <file>` | `.codarch/report.json` | Diff report; if it does not exist, it carries on without it |
| `--no-report` | — | Do not load a report |
| `--head-report <file>` | `.codarch/head-report.json` | Changes since the last commit; wins over `--report` when present |
| `--no-head-report` | — | Do not load that report |
| `-h`, `--help` | — | Help |
| `-v`, `--version` | — | Version |

An explicit `--report` or `--head-report` that does not exist is an error. The default report being
absent is not.

The HEAD report describes the **working tree against its last commit**, which is what the app shows
in **Changes**; that is why it is preferred over `report.json`, which describes a PR. The
`get_architecture_map` response says in `reportSource` where the changes come from (`head`, `report`
or `none`).

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Help or version printed, or the server ended normally. |
| `1` | Invalid option, or the snapshot could not be loaded or the server could not start. |

## Tools

All input paths are relative to the project. A file id and the root name as a prefix
(`my-project/src/a.ts`) are also accepted. Absolute paths and `..` are rejected.

### `get_architecture_map`

Compact tree of folders and files with size, maximum complexity, risk and changes.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `folder` | string | root | Folder to start from |
| `depth` | 1–6 | 2 | Levels of descendants |
| `limit` | 1–100 | 20 | Maximum children per folder |
| `includeFiles` | boolean | true | Include file leaves |

Each folder declares `files` (all its descendants), `childFolders`, `metrics.size`,
`metrics.maxComplexity`, `metrics.risk` and, if there is a report, `changes` with added, changed,
removed, hotspots and violations. Children that do not fit in `limit` are summarised in
`truncated`.

### `find_hotspots`

Ranking of files by risk or by a snapshot metric.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `scope` | `snapshot` \| `diff` | `snapshot` | Current values or report deltas |
| `metric` | string | `risk` | `risk` or a metric present in the snapshot |
| `folder` | string | root | Filter by folder |
| `limit` | 1–100 | 10 | Number of results |
| `minValue` | number | 0 | Exclusive minimum value |

In `scope: "diff"` the metric is decided by the report (`hotspotMetric`); if you pass another one,
the tool fails with a clear message. Diff hotspots include `base`, `head` and `delta`.

### `check_change_impact`

Dependents (who imports it) and/or dependencies (what it imports) of a file or folder.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `path` | string | — | Path or id of the file/folder |
| `direction` | `dependents` \| `dependencies` \| `both` | `dependents` | Direction of the walk |
| `depth` | 1–8 | 2 | Maximum hops |
| `limit` | 1–200 | 50 | Impacted nodes |

Returns the nodes with `depth`, `directions`, `risk` and, if there is a report, their change status.
It includes cycle membership, related violations and `summary.truncated`.

### `list_violations`

Lists the report's violations, separating `introduced`, `existing` and `resolved`.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | `all` \| `introduced` \| `existing` \| `resolved` | `all` | Status |
| `severity` | `all` \| `info` \| `warn` \| `error` | `all` | Severity |
| `type` | `all` \| `forbidden` \| `threshold` \| `cycles` | `all` | Rule type |
| `rule` | string | — | Exact rule name |
| `limit` | 1–100 | 20 | Results |

Only `introduced` violations with `error` severity block the diff gate; MCP shows them all so the
agent can explain previous debt without confusing it with a new failure.

### `get_project_config`

The repo's configuration, read the same way the CLI reads it: the `.codarch.yml` and the addons it
declares. No parameters.

- `file`: the file read (usually `.codarch.yml`); `null` if there is none;
- `profile`: the domain profile the team chose, if any;
- `layers`: the effective layers with their glob patterns;
- `rules`: the effective rules, each with its `source` (`config`, `profile` or
  `addon:<name>`; the team's wins);
- `ignore`: the patterns the repo excludes from the analysis;
- `addons`: the declared addons with their profiles and their **saved views** (the same short state
  the app's URL uses);
- `errors`: the addons that could not be loaded.

If the file declares an addon that is not in `addons/`, the tool does not fail: it returns what it
could read and explains it in `reason`.

### `get_migration_plan`

Migration plan to another language: how much is left, where and how it has changed.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `folder` | string | root | Limit the plan to a folder |
| `limit` | 1–100 | 15 | Files with the most debt |

Returns `summary` (status by language and by category `js`/`rust`/`bridge`/`native`, total debt,
FFI crossings and bridge files), `topDebt` (the files with the most debt, with their language,
status and crossings) and `changes` (if there is a `report.json`: the files whose debt grew or
shrank, and the total debt delta). If the snapshot does not have the migration lens, `available` is
`false` and it says so.

### `get_history`

The repository's timeline: the snapshots saved with `codarch analyze --history`.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `snapshot` | string | — | Specific snapshot: part of its date or checksum |
| `limit` | 1–100 | 10 | Maximum entries |

Without `snapshot` it returns the timeline (date, checksum, files, rloc, debt, heat and the most
touched files). With `snapshot` it also returns that snapshot.

### `get_symbol_chain`

The life of a symbol across the history: when it was born, how it was renamed or moved, how many
times its complexity changed and when it disappeared. It also returns the repo's **heat**: the most
rewritten symbols ✓.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `symbol` | string | — | The symbol: function, class or type name; without it, only heat |
| `limit` | 1–50 | 10 | Maximum chains |

Without `symbol` it returns the repo's heat and no chains. With `symbol` it searches **only symbol
chains**, by current name or path or by those of any previous version: a rename or a move does not
hide the symbol. `limit` caps the chains and goes up to 50.

### `map_screenshot`

The map, as a PNG. It is the only tool that is not read-only: it writes the image into
`.codarch/shots/` and declares it with `readOnlyHint: false`.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `area` | string | `rloc` | Metric that decides each box's area |
| `color` | string | `risk` | `risk`, `structure`, a metric or `churn` |
| `width` | 160–4096 | 1400 | Width in pixels |
| `height` | 160–4096 | 900 | Height in pixels |

It returns two blocks: the image (`image/png`, so the client paints it) and a JSON with the file, the
slot, the bytes and the `summary` —project, area, colour, legend scale and the largest cells with
their path, area and value—. The image carries the names of the largest cells and of the folders,
with the package's own bitmap font; the scale and the numbers live in the summary.

There are **two slots**, `map-1.png` and `map-2.png`: the capture takes the free one and, with both
taken, overwrites the oldest. The previous one stays there, which is what you compare against. An
area or colour the snapshot does not have returns `isError` with the message about the missing
metric.

### `explain_module`

A file or folder's sheet:

- metrics, risk and the file's risk ranking;
- incoming and outgoing edges with weight and type-only;
- runtime cycle (membership and size);
- status in the diff, changes and hotspot;
- violations that mention the path.

For a folder it aggregates its files, shows the highest-risk ones and summarises the edges leaving
or entering the set. `limit` (1–50, default 5) controls the detail edges and files.

## Behaviour and limits

- **Read-only.** There are no tools to analyse, write rules, create snapshots or modify the
  repository. It reads the snapshot, the report and, if it exists, the repo's configuration.
- **No network.** It does not query GitHub; for a PR, point it at the artefacts already on disk.
- **No invented prose.** The server returns JSON with the observed fields. The agent decides how to
  explain it.
- **Deterministic.** The same snapshot and report produce the same result; no timestamps are added.
- **Verified cycles.** They are computed with SCC over the snapshot's edges, not copied from
  optional metrics.
- **Folder aggregation.** Size = sum; complexity = maximum; risk = maximum. Only direct children
  appear at each level.
- **Explicit truncation.** `truncated` says how many children or nodes were left out. The limits
  prevent giant responses; they do not change the underlying data.
- **Errors.** A non-existent path, an unknown metric or an invalid report return `isError` with an
  actionable message; they do not return silent partial data.

## Structure

```
apps/mcp/
├── bin/codarch-mcp.mjs   launcher without npm noise
├── src/store.ts          snapshot/report index, paths, risk, cycles, aggregates
├── src/tools.ts          the thirteen queries
├── src/server.ts         MCP registration and input schemas
├── src/index.ts          stdio entry and options
└── test/                 45 tests, including in-memory transport
```

The server loads and indexes once; calls work in memory. `npm test` covers the tools, the server and
the in-memory MCP transport. There is also a manual stdio test against the action's artefacts.

### `suggest_architecture`

The `codarch suggest` query: it deduces from the graph which layers the code already has and which
rules would protect them. It returns the fragment for `.codarch.yml` with its `configVersion`, the
detected layers (with their patterns, how many files each has and what depends on them), the folders
that fit no layer, the catalogue profiles that fit best and which of that profile's rules the repo
breaks today.

A layer's size counts **files**, not dependencies: a one-file layer says one even when several edges
cross it.

It proposes; the team decides. Rules come in as a warning.

### `list_profiles`

The `codarch profiles` catalogue: each profile with what project it is for, its layers and its rules
with the severity they come in with. A profile is chosen in `.codarch.yml` with `profile: <id>`.

### `verify_history`

The `codarch verify` check: every symbol in the snapshot must be the latest version of its chain. If
the body hash is not the chain's, the snapshot and the history are telling different stories. It
returns `checked`, `projectHead` and the `mismatches` with their reason; without history,
`available: false` and the reason.

It uses the snapshot the server already loaded, not a second read from disk.

## What it does not do yet

- Remote HTTP/SSE server, authentication or multi-repo.
- Automatic refresh when the snapshot changes; the server must be restarted or another process
  started.
- Analysis tools, or tools that write rules or change the code. The only one that writes anything is
  `map_screenshot`, and it only leaves the capture's PNG.
- Symbol-level navigation; nodes are files.
- Publishing the npm package. For now it runs from the checkout.

:::note[Learn more]
The decisions behind this page: [ADR 0013 — Servidor MCP de solo lectura](../desarrollo/adr/0011-0020/0013-mcp-readonly.md), [ADR 0038 — El alcance del análisis se declara en `.codarch.yml`](../desarrollo/adr/0031-0040/0038-el-alcance-del-analisis.md), [ADR 0029 — Los addons: conocimiento declarativo](../desarrollo/adr/0021-0030/0029-los-addons.md), [ADR 0006 — Nodos = ficheros, preparados para símbolos](../desarrollo/adr/0001-0010/0006-nodos-fichero.md).
:::
