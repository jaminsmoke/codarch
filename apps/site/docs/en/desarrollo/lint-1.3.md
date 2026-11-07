---
title: Lint artifact 1.3
description: "Lint coverage contract. Measurement lives in coverage, findings live in files, and scopeHealth reports the state of a file, a folder, or the project without storing anything else."
section: desarrollo
sidebar:
  label: Lint artifact 1.3
  order: 4
---

The schema is **1.3**. The names do not change: `lint.repmod.json` for code and `lint-rest.repmod.json` for documents. There is no separate stored state and no per-folder health in the file. The view that joins the two is computed on read, with `scopeHealthMerged` ([ADR 0109](adr/0101-0110/0109-la-salud-del-lint-se-lee-junta.md)): it is not written and it is not part of the checksum.

Coverage is the only truth of **what was looked at**. `files` holds findings only. Config stays in `meta.tools` and `meta.systems`; a consumer derives a `config` block and does not duplicate it in the file.

A path is relative, with `/`, NFC per segment, and case preserved. The same function is used to write, to read, and to look up.

## The artifact

```ts
type LintArtifact = {
  schemaVersion: "1.3"
  domain: "code" | "docs"
  meta: {
    checksum: string
    tools: string[]
    systems: { name: string; config: string | null; rules?: unknown[]; note?: string }[]
    tree?: string
  }
  files: Record<string, { errors: number; warnings: number; messages: LintMessage[] }>
  summary: {
    files: number
    errors: number
    warnings: number
    messages: number
    measured?: number
  }
  coverage: { tools: Record<string, ToolCoverage> }
}
```

`summary` is the **project** scope counted again. `measured` is present only when coverage can derive it. A zero that does not come from a valid enumeration is not written.

A 1.0, 1.1, or 1.2 file is still read. In memory it becomes 1.3 with `coverage.legacy: true` and every tool `unknown` + `legacy-global`. `measured` is not carried over.

## One tool's coverage

```ts
type ToolCoverage =
  | { outcome: "enumerated"; measuredPaths: string[]; eligiblePaths: string[] | null }
  | { outcome: "unknown"; eligiblePaths: null; reasons: Reason[] }
  | { outcome: "failed" | "missing"; eligiblePaths: null; reasons: Reason[] }

type Reason = {
  code:
    | "legacy-global"
    | "tool-failed"
    | "tool-missing"
    | "unknown-eligibility"
    | "unknown-paths"
    | "not-eligible"
    | "not-found"
    | "no-eligible"
    | "freshness-unverified"
  text?: string
}
```

`measuredPaths: []` only when the tool really enumerated and looked at nobody. An empty or failed parse is not that list: it is `ok: false`.

```ts
type AdapterEnumeration =
  | { ok: true; measuredPaths: string[] }
  | { ok: false; reason: Reason }
```

ESLint and Checkstyle enumerate and leave `eligiblePaths: null`. Code does not reach `complete`. oxlint, Biome, Ruff, go vet, and dotnet stay `unknown` + `unknown-eligibility`; their findings are kept.

## scopeHealth

```ts
scopeHealth(artifact | null, scope, snapshot?) => ScopeHealth

type Scope = { kind: "file" | "folder" | "project"; path: string }
type Snapshot = { treeHash: string | null; paths: readonly string[] }

type ScopeHealth = {
  domain: "code" | "docs"
  scope: Scope
  coverage: {
    state: "unmeasured" | "unknown" | "partial" | "complete"
    eligible: number | null
    measured: number | null
    byTool: Record<string, {
      state: "unmeasured" | "unknown" | "partial" | "complete"
      eligible: number | null
      measured: number | null
      reasons: Reason[]
    }>
    reasons: Reason[]
  }
  fresh: boolean | null
  counts: {
    errors: number
    warnings: number
    info: number
    findings: number
    filesWithFindings: number
  }
  affectedFiles: { path: string; counts: ScopeHealth["counts"] }[]
  messages: LintMessage[]
}
```

`messages` is filled only for a file. For a folder and the project it is `[]`.

Counts are the exact sum of `affectedFiles`, including the root. They come from messages. Coverage does not change them: `unknown` or `partial` does not drop a valid finding.

A number that is not known is `null`, never `0`. `0` appears only when a valid enumeration says so.

`fresh` is orthogonal to the state. `true` when `meta.tree` is the snapshot checksum (`cc.json` for code, `rest.cc.json` for documents). `false` when both exist and differ. `null` when they cannot be compared, and then `freshness-unverified` is added. A stale tree does not erase `partial`.

Actually clean only if `complete` and `fresh === true` and `findings === 0` and `eligible > 0`. `fresh === null` reads “freshness not verified”: there was no comparison, and the reason is `freshness-unverified`. `fresh === false` reads “result from another tree / out of date”. They are not the same phrase.

## States

### unmeasured

Nothing was measured. No artifact, or the tool failed or is missing, or the valid universe is empty (`no-eligible`), or the file is outside it (`not-eligible`), or the snapshot proves the file is absent (`not-found`). This is not “measured and clean”.

```json
{
  "domain": "code",
  "scope": { "kind": "project", "path": "" },
  "coverage": {
    "state": "unmeasured",
    "eligible": null,
    "measured": null,
    "byTool": {},
    "reasons": [{ "code": "freshness-unverified" }]
  },
  "fresh": null,
  "counts": { "errors": 0, "warnings": 0, "info": 0, "findings": 0, "filesWithFindings": 0 },
  "affectedFiles": [],
  "messages": []
}
```

### unknown

Something was measured, or the artifact is old, but coverage cannot be closed. Always for 1.0–1.2 (`legacy-global`) and for an adapter that does not enumerate (`unknown-eligibility`). ESLint with `eligiblePaths: null` is also `unknown`: `measured` is known, the universe is not, and the state is not `complete`.

```json
{
  "domain": "code",
  "coverage": {
    "state": "unknown",
    "eligible": null,
    "measured": 2,
    "byTool": {
      "eslint": {
        "state": "unknown",
        "eligible": null,
        "measured": 2,
        "reasons": [{ "code": "unknown-eligibility" }]
      }
    },
    "reasons": [{ "code": "unknown-eligibility" }, { "code": "freshness-unverified" }]
  },
  "fresh": null,
  "counts": { "errors": 0, "warnings": 0, "info": 0, "findings": 0, "filesWithFindings": 0 }
}
```

With zero findings and a known `measured`, the phrase is “measured, no findings, universe not verified”.

### partial

There is a valid enumeration and another tool failed, is missing, or is unknown. A stale tree does not erase it.

```json
{
  "coverage": {
    "state": "partial",
    "eligible": null,
    "measured": 1,
    "byTool": {
      "eslint": {
        "state": "unknown",
        "eligible": null,
        "measured": 1,
        "reasons": [{ "code": "unknown-eligibility" }]
      },
      "oxlint": {
        "state": "unmeasured",
        "eligible": null,
        "measured": null,
        "reasons": [{ "code": "tool-failed", "text": "output is not JSON" }]
      }
    },
    "reasons": [
      { "code": "tool-failed", "text": "output is not JSON" },
      { "code": "unknown-eligibility" }
    ]
  },
  "fresh": false
}
```

### complete

Every applicable tool finished and the universe is known. For documents, `eligiblePaths` and `measuredPaths` are the same documents. Code in this delivery does not reach it: ESLint and Checkstyle do not name the universe.

```json
{
  "domain": "docs",
  "coverage": {
    "state": "complete",
    "eligible": 2,
    "measured": 2,
    "byTool": {
      "codarch": {
        "state": "complete",
        "eligible": 2,
        "measured": 2,
        "reasons": []
      }
    },
    "reasons": []
  },
  "fresh": true,
  "counts": { "errors": 0, "warnings": 0, "info": 0, "findings": 0, "filesWithFindings": 0 }
}
```

That, with `eligible > 0` and `fresh === true`, is clean and current. If `fresh` is `null`, the phrase is “freshness not verified”. If it is `false`, “result from another tree / out of date”.

## Codes

| Code | When |
|---|---|
| `legacy-global` | A 1.0–1.2 artifact. `measured` is null. |
| `legacy-version` | Added by `scopeHealthMerged` for a legacy artifact. It is not in the file. It does not become `complete`. |
| `tool-failed` | The process wrote something that could not be read. |
| `tool-missing` | The command is not there. |
| `unknown-eligibility` | It is not known who should have been looked at. oxlint, Biome, Ruff, go vet, dotnet, and ESLint or Checkstyle with `eligiblePaths: null`. |
| `unknown-paths` | There is no snapshot, so the file cannot be said to be absent. |
| `not-eligible` | The universe is proven and the file is outside it. State `unmeasured`. |
| `not-found` | The snapshot proves the file is absent. State `unmeasured`. |
| `no-eligible` | A valid `eligiblePaths: []`. State `unmeasured`, `eligible: 0`. Not clean. |
| `freshness-unverified` | `fresh` is `null`. It does not change the state. |

`not-eligible` is not used when the universe is `null`. `not-found` is not used without a snapshot: that is `unknown` + `unknown-paths`.

## Documents

Rest coverage is **per document, not per rule**. A document is in `eligiblePaths` and `measuredPaths` even when one rule could not read the frontmatter. Missing or unread frontmatter is not an exhaustive review of the text: it is a finding of that rule, and the document still counts as measured. A config file or an asset is not included: nobody judged them.

## Risk

The index does not read the whole artifact. It reads each file's `scopeHealth` and adds a term before gamma. The formula and the cases —`fresh` true, false and null, unknown universe, not applicable, not found— are in [risk](riesgo.md).
