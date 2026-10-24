---
title: "MCP: architecture for agents"
description: "CodArch exposes its model to agents through a local, read-only MCP server over stdio. It does not analyse code inside MCP: it reads an already generated cc.json snapshot and,…"
section: producto
sidebar:
  label: "MCP: architecture for agents"
  order: 3
---

CodArch exposes its model to agents through a **local, read-only MCP server over stdio**. It does not
analyse code inside MCP: it reads an already generated `cc.json` snapshot and, if it exists, the
diff's `report.json`. That way the agent sees the same facts as the CLI, the map and the PR comment.

The decision is in [ADR 0013](adr/0011-0020/0013-mcp-readonly.md).

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
| `-h`, `--help` | — | Help |
| `-v`, `--version` | — | Version |

An explicit `--report` that does not exist is an error. The default report being absent is not.

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
declares (ADR 0029). No parameters.

- `file`: the file read (usually `.codarch.yml`); `null` if there is none;
- `profile`: the domain profile the team chose, if any;
- `layers`: the effective layers with their glob patterns;
- `rules`: the effective rules, each with its `source` (`config`, `profile` or
  `addon:<name>`; the team's wins);
- `ignore`: the patterns the repo excludes from the analysis
  ([ADR 0038](adr/0031-0040/0038-el-alcance-del-analisis.md));
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
├── src/tools.ts          the nine queries
├── src/server.ts         MCP registration and input schemas
├── src/index.ts          stdio entry and options
└── test/                 34 tests, including in-memory transport
```

The server loads and indexes once; calls work in memory. `npm test` covers the tools, the server and
the in-memory MCP transport. There is also a manual stdio test against the action's artefacts.

## What it does not do yet

- Remote HTTP/SSE server, authentication or multi-repo.
- Automatic refresh when the snapshot changes; the server must be restarted or another process
  started.
- Write or analysis tools.
- Symbol-level navigation; nodes are files (ADR 0006).
- Publishing the npm package. For now it runs from the checkout.
