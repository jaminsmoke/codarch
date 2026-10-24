---
title: The browser does not drag Node stores along
date: "2026-10-23"
category: fix
verdict: arreglo
---

**What it was**: `npm run web:build` warned that `node:fs` and `node:path` were being externalized
from `packages/schema/src/history-store.ts` and `chain-store.ts`. The browser bundle only uses the
schema's browser-safe entry, but the parser core —shared with the CLI— imported the root entry,
which exports the history and chain stores. The warning was real: Node code was entering the
browser graph.

**Decision**: `@codarch/schema/browser` also exposes the identity the parser needs; the parser core,
the migration and `render/model` use that entry. The Vite alias resolves `@codarch/schema` to the
browser-safe entry, so a future import does not bring the stores back. The root still exports
`history-store` and `chain-store` for the CLI, the MCP and the desktop app. `web-tree-sitter`
warnings remain (`fs`, `path` and an Emscripten `eval`): they are Node branches and library code,
not ours; they are documented and not silenced.

**Verdict**: **fix**, no ADR: it is packaging, not model; done.
