---
title: The whole file, without a tab
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: double-clicking a map block opened the file in a **Código** tab, which [ADR 0085](../adr/0081-0090/0085-la-ruta-del-mapa-navega.md) retired because mounting the whole block froze the app. Since then, seeing a complete file meant opening it in the editor outside.

**What it is**: **double-click** a file's block and the stage paints its whole code, read-only, with the sheet's own editor ([ADR 0087](../adr/0081-0090/0087-el-fichero-entero-en-el-escenario.md)). There is no tab: the map gives up its place. The path becomes `Todo / packages / ui / useCodarchApp.tsx`, and any segment, **Todo**, the arrow or `Esc` brings the map back; inside the code, the header carries a **← Mapa** that does the same. The platform serves the whole file up to 5,000 lines and 4 MB through the same door as a snippet, with the same path rules.

**Why this way**: the cost that sank the tab is gone. With CodeMirror, `useCodarchApp.tsx` (1,000 lines) mounts in **5.3 ms**, leaves **no long task** and paints **83 lines** with 495 nodes, scrolling inside the stage. A tab was exactly what 0085 removed, and the open file's state does not go to the URL: it is a gesture of the view, and it closes when another snapshot is loaded.

**How it is checked**: with the repo open, double-clicking `useCodarchApp.tsx` shows its 1,000 lines with the gutter starting at 1…, the map out of the DOM and the zoom hidden; the path carries the file's name and **Todo** or `Esc` bring the map back with its 348 cells. `packages/parsers/test/source.test.ts` covers reading the whole file and its path rules.

**Verdict**: ADR 0087, with no new phase. The view goes to the URL as of the [open file in the link](2026-10-27-76-el-fichero-abierto-en-el-enlace.md) entry; the check in the packaged desktop app stays open.
