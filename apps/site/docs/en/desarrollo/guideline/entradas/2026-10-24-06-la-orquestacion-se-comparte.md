---
title: Orchestration is shared
date: "2026-10-24"
category: docs
verdict: fase
---

**What it is**: the web and desktop apps stopping having two independent `App.tsx` files and sharing
the orchestration (state, data loading, analysis) through a `useCodarchApp` hook in `@codarch/ui`,
with one adapter per platform.

**Why**: the visual pieces are already shared (M26), but the orchestration —1821 lines in the web
app and 1106 in the desktop— is duplicated. Every new feature is implemented twice and drift is
inevitable.

**Decision**: [ADR 0049](../../adr/0041-0050/0049-la-orquestacion-se-comparte.md). The hook
encapsulates the state and the operations; each app only connects its adapter (HTTP on the web, IPC
on the desktop).

**Verdict**: **phase M33**, in the roadmap of
[ADR 0049](../../adr/0041-0050/0049-la-orquestacion-se-comparte.md).
