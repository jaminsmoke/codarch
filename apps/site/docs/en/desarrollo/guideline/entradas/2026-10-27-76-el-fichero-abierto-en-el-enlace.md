---
title: The open file, in the link
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: [ADR 0087](../adr/0081-0090/0087-el-fichero-entero-en-el-escenario.md) left the open file out of the URL: pointing at a file in a ticket meant writing the path and hoping the other person found it on the map and double-clicked it.

**What it is**: the URL gains **`code`** with the path of the file filling the stage —`?file=…&tab=file&code=…`— and on start it opens if the snapshot has it ([ADR 0088](../adr/0081-0090/0088-el-fichero-abierto-va-en-la-url.md)). Closing the code (path, `Esc` or **← Mapa**) drops the key. A path that is no longer there is ignored, and if the platform cannot read the file —the static demo— the stage says so and lets you go back to the map.

**Why this way**: `code` carries its own path, so it cannot contradict `file` the way a `view=code` relying on another key would. It is written with `replaceState`, like the rest of the view state ([ADR 0018](../adr/0011-0020/0018-estado-vista-en-la-url.md)): opening code adds no browser history entry, and the path, `Esc` and the button are there to return. An addon's saved views do not carry it: their key list is closed.

**How it is checked**: `packages/ui/test/viewState.test.ts` covers reading, writing and dropping `code`, that a link works with `code` alone and that a saved view does not open code. In the served app, double-clicking leaves `code=packages/ui/src/useCodarchApp.tsx`, a reload opens that file directly and **← Mapa** drops it.

**Verdict**: ADR 0088, with no new phase.
