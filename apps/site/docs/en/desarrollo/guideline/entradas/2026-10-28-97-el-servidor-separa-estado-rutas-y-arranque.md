---
title: The server separates state, routes and startup
date: "2026-10-28"
category: refactor
verdict: arreglo
---

**What it was**: `apps/cli/src/commands/serve.ts` had **613** lines of code and **45** of complexity in a single function, `runServe`, which was the highest in the repository after the two that had already been split. Four things that change for different reasons lived inside: the state that gets reanalysed, the file watcher, the folder change and a chain of seventeen `if (pathname === …)` that was the whole API. Its debt was **230**, the highest left.

**What it is**: three files with one subject each. `serve.ts` is the startup —it checks the root, finds the web build, mounts and listens— with **97** lines and complexity **10**; `serve-live.ts` keeps the state that changes and its watcher (**207** lines, complexity **5**); `serve-routes.ts` holds the HTTP server with a **dispatch table** —one route, one function— and each route between 2 and 5 of complexity (**437** lines, complexity **10**). The three together owe **112** against the previous 230.

**Why like this**: live state and responses do not share a lifetime. The state changes while the server listens —a save, live turned off, another folder— and the routes are static: all that changes is what they read. The dispatch table replaces the comparison chain because the API is exactly that, a map from route to response, and adding a route no longer lengthens a function. `ServeOptions` stays in `serve.ts` and the routes do not import it: they ask only for the own origin, the web build and the state.

**How it is checked**: six new cases in `apps/cli/test/serve-routes.test.ts` raise the `handle` on a free port and ask for the snapshot, the meta, a file's source, a folder change from loopback, a POST from another origin —which stays 403—, the heartbeat without watch —204—, a method that does not belong —405 with its `Allow`— and an unknown route. The whole suite sits at **978** cases and **122** files. Repository debt drops from **10,381** to **10,271**, and the app running against the repo says so in its header.

**Verdict**: done. Next are `apps/cli/src/commands/analyze.ts` (complexity 35, debt 216), `packages/parsers/src/migration.ts` (41, 210) and `packages/metrics/src/diff.ts` (38, 195).
