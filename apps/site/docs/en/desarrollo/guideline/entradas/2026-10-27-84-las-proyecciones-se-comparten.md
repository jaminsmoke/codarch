---
title: The projections are shared
date: "2026-10-27"
category: refactor
verdict: arreglo
---

**What it was**: the two `Plataforma` adapters repeated the same two projections: pulling `entries` out of the history and `heat` out of the chains payload. Four guards written twice, and not even alike: the web checked that the payload was an object, the desktop trusted the bridge; the desktop returned whatever came if it was not an object, which in the type slipped through as if it were a list.

**What it is**: `historyEntries(payload)` and `symbolHeat(payload)` live in `@codarch/ui`, next to the `Plataforma` contract that already imported those types, and each adapter keeps its transport: `historial: async () => historyEntries(await fetchJson("data/history.json"))` in the web, `historyEntries(await desktop().history())` in the desktop. A payload that comes back odd is `null`.

**Why this way**: transport does belong to each platform —HTTP with `data/*.json` in the web, IPC in the desktop— and the shape of what is served belongs to the contract, which was already written once. There is no new ADR: it is the debt of the same seam as [ADR 0073](../adr/0071-0080/0073-una-sola-interfaz.md) and [ADR 0074](../adr/0071-0080/0074-una-sola-sesion.md). Leaving them in each adapter "because it is four lines" was discarded: they were four lines with two different behaviours in the face of the unexpected, which is exactly how copies diverge.

**How it is checked**: `packages/ui/test/platform.test.ts` covers both projections: the list that is there, the empty list (which is valid), the missing key and the payload that cannot be understood —number, string, array— which comes out `null`. The two apps' tests are still green, untouched.

**Verdict**: a fix inside ADR 0073 and ADR 0074. Together with the local store from the previous entry, this was the last duplication on the list that remained between the web app and the desktop; what stays in each app —who analyzes, picking a folder, IPC or HTTP— is the port, not a copy.
