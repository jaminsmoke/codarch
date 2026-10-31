---
title: "The local storage, by trade"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: `packages/ui/src/storage.ts` had 197 lines and **four trades** inside one module: the storage
keys, opening it and forgetting a key; the view preferences with their type, validator, reader and writer; the
enabled plugins; and the shape of a saved project, with its validator and reader. Ten functions that both apps
and the UI index imported from the same place —**fanIn 20**, the highest in the repo—. It was the **first by
debt**: 315. The debt did not come from complexity (14) but from everyone depending on the whole module to use
one piece.

**What changes**: `storage.ts` is down to **18 lines** and only gathers; each trade lives in its sibling module:

| Module | What it is |
|---|---|
| `storage-local.ts` | the three keys, opening `localStorage` and forgetting a key |
| `storage-preferences.ts` | `ViewPreferences`, its validator and its reader and writer |
| `storage-plugins.ts` | the plugins enabled on the machine |
| `storage-project.ts` | `SavedProject`, its validator and the reader by key |

Dependencies go one way: preferences, plugins and project read `storage-local`; `storage.ts` gathers them
because it is the door `@codarch/ui/storage`, `apps/web`, `apps/desktop` and the UI index already use. And
what inside the UI only needed to open the storage —`theme`, `CollapsibleSection`, `ToolDock`,
`InspectorDock` and `pluginBindings`— now imports `storage-local`, not the whole vocabulary.

**Why this way**: local storage is a platform piece, not a presentation one, and the split was backwards:
whoever wanted `localStore()` also got the saved project's format and everyone's keys. Splitting changes no
logic —the comments that explain each rule travel with their function, from the project's shape guard to the
plugin list— and leaves the public door intact, so neither app changes a single import.

**Verified**: the whole suite green —**173 files and 1497 tests**—, the 66 UI, web and desktop tests among
them, and `storage.test.ts` pinning the same: preferences and plugins round-trip, the project normalized with
its addons, discarding what is not understood and staying silent when there is no storage. Typecheck and lint
clean, and the site builds. The file's debt drops from **315 to 16** and it stops being the repo's first; the
worst of the new pieces is **40** (`storage-local`). No new tests: there is no new behavior, only pieces.

**Verdict**: fix.
