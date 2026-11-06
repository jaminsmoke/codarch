---
title: "Lint counts and paths come from the messages"
date: "2026-11-06"
category: "fix"
verdict: "adr"
---

**What it was**: the reader returned the artifact's declared counts even when
they did not match the messages, and it kept each file key as it arrived.
`./src/a.ts` or an NFD path did not land on the map's file. `summary.measured`
was read like any other count, without saying it is the pass's global coverage.

**What changes**: the schema stays at **1.2** ([ADR 0106](/en/desarrollo/adr/0101-0110/0106-las-cuentas-y-las-rutas-del-lint/)).
On read, `errors`, `warnings` and the legacy `summary` are regenerated from the
messages. `summary.files` is the files with findings. `summary.measured` is
kept and not recomputed. Paths go through `canonicalLintPath`: NFC per segment,
`/`, no `./` and no `..`, and no lowercasing. If two distinct keys fall on the
same path, `diagnostics` says so and the messages are kept. Live announces
`lintTotals`. The names stay `lint.repmod.json` and `lint-rest.repmod.json`.

**Why this way**: the sheets already counted messages; the reader did not.
Bumping the schema or merging the keys silently would have hidden the data or
broken what is already written.

**Verified**: drift of 9/9 against one warning, `info`, read idempotence,
1.0 and 1.1 round-trip, NFD against NFC, slashes, `./`, `//`, `..` rejection,
case, collision, and render and the MCP seeing the canonical path.

**Verdict**: done. No new phase.
