---
title: A symbol's chain is searched by its life
date: "2026-10-23"
category: fix
verdict: arreglo
---

**What it was**: `get_symbol_chain` said it returned the repo's heat, but without `symbol` it
answered with an error and empty heat. The search walked files, folders and project, only looked at
the current name, and the schema promised a `limit` of 50 that the payload cut to 20. On top of
that, every symbol chain was stored as `function`, even for classes or interfaces.

**Decision**: [ADR 0039](../../adr/0031-0040/0039-la-busqueda-de-una-cadena.md). Without a symbol it
returns the heat; with a symbol it only searches symbol chains by the current name or path or by
those of any version, the limit is respected and the real type is kept. The snapshot and the
checksum do not change; the ledger is rebuilt.

**Verdict**: **fix**, with ADR 0039; done.
