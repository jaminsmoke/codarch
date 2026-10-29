---
title: "Lint has a format"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: [ADR 0094](../../adr/0091-0100/0094-el-lint-en-el-mapa.md) decided lint would get its own artifact, but nothing wrote or read it: there was no format and no way to go from what ESLint says to what the map needs.

**What changes**: `packages/lint` is born with `.codarch/lint.json` (`schemaVersion` 1.0): sorted, deduplicated tools; files by relative path with `errors`, `warnings` and `messages`; a summary; and an MD5 checksum of `{ tools, files }`. Two normalizers translate the tools' real output: `eslint --format json` —absolute paths to relative ones, severities 1 and 2, `ruleId: null` as `(parser)`— and `oxlint --format json` —with or without the `diagnostics` wrapper, `eslint(no-debugger)` as `no-debugger`, and the label as line and column—. Identical messages from two tools are counted once and everything is sorted, so the input order does not change the file. `stableStringify` moves to `@codarch/schema` so the snapshot and lint share a single canonical serializer, and `@codarch/lint/browser` exposes the format without `node:path` for when the app reads it.

**Why like this**: the artifact is the boundary. Each linter speaks its own dialect and the app should not need to know them; what it shares is the normalised message. The file existing means "measured", even with no messages: without it a repo is not clean, it is unmeasured.

**Verified**: 14 new tests —ordering and checksum, deduplication across tools, paths outside the repo, malformed input and both dialects— plus a manual check against the real output of `eslint -f json` and `oxlint -f json` on a file with `var` and `debugger`. Full suite (1144), lint and typecheck green.

**What is missing**: `codarch lint`, loading in `serve`, the web and the desktop, the fourth risk signal, the fichas and the Linter lens.

**Verdict**: phase under way.
