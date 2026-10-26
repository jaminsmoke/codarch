---
title: Orchestration is shared now
date: "2026-10-24"
category: chore
verdict: fase
---

**What it is**: the web and desktop apps stopping having two independent `App.tsx` files. State and
operations live in `useCodarchApp` (`@codarch/ui`); each app only connects its adapter.

**Why**: the visual pieces were already shared (M26), but the orchestration was duplicated:
`loadSnapshot`, `loadReport`, `analyzeFolder`, preferences, tabs, focus, zoom and labels were
written twice. Every new feature was double and drift, inevitable.

**What changed**: both `App.tsx` files use the hook and drop from 1821 to 1565 lines (web) and from
1106 to 762 (desktop). Both copies of `plugins.ts` are gone and the storage types move to
`@codarch/ui`. The desktop keeps what is its own (IPC, `.codarch/`) and the web keeps its own
(server, URL, demo, in-browser analysis with progress and cancellation); the capabilities a platform
does not have stay optional in `Plataforma`.

**Verdict**: **phase M33, closed**, in the roadmap of
[ADR 0049](../../adr/0041-0050/0049-la-orquestacion-se-comparte.md).
