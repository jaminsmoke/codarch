---
title: The server leaves its cache behind
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: `serve` already read the parse work of its scopes and of its own root, but it did not leave the cache from its passes. Restarting the server —or the `analyze` that came next— paid again for the full parse of what the server had already parsed. And its comment said "does not write into the repository" even though the chains book already lived in `.codarch/`.

**What it is**: every analysis by the server —the initial one, the live one and the one after a root change— leaves its `.codarch/parse-cache.json`, with the same serializer the desktop and the CLI use (`writeParseCachePayload`). From there the next analysis finds it, be it the server's, the desktop's or `codarch analyze`'s. The command's comment is adjusted to what it does: it does not touch the working tree, it writes derived, ignored state.

**Why this way**: with this the three platforms that analyze —CLI, `serve` and desktop— read and write alike, and one cache serves the next regardless of who wrote it or which app is open. It is not measured again: it is the same store and the same pipeline, and the [ADR 0089](../adr/0081-0090/0089-cada-alcance-lee-los-de-abajo.md) gate was already passed with a **90 %** saving; what changes is that the server's work is no longer thrown away when it closes. On the browser side there is no equivalent to do: its in-memory file system does not know `stat`, which is the cache's key, and the static build does not even analyze.

**How it is checked**: `apps/cli/test/serve.test.ts` analyzes a repo with `analyzeState` and checks that it has left `parse-cache.json` with its root and its two entries, and that a fresh module —a new session, like a freshly started server— gives the same checksum. That the entries are **reused** is covered by `packages/parsers/test/repo-session.test.ts`, which is the session the server uses: `2 reused · 2 parsed`.

**Verdict**: ADR 0089, inside M34. With this, all three platforms that analyze leave their cache.
