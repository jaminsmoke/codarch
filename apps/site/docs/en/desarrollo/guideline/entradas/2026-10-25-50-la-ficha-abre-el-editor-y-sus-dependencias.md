---
title: The file card opens the editor and its dependencies
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: the card already showed the code, but editing it meant finding the file and line by hand. And from the import graph only fan-in/fan-out numbers were visible, not the names of the files it talks to.

**What changed**: the code block gains **Editor** and **Copy path**. On desktop and the served web, Editor builds `vscode://file/…:line` and opens the file; Copy path leaves `path:line` on the clipboard and always works, including the browser's folder analysis, where there is no absolute path. The File tab gains **Dependencies**: **Imports** and **Used by**, deduplicated and sorted, and each path opens that file in the map and the card.

**Numbers**: dependencies come from the existing `RenderModel`; nothing is added to `cc.json` and the checksum does not change. `tools.ts` shows 5 outgoing and 3 incoming edges, with names instead of only `fanOut`/`fanIn`. The code keeps its black background and Prism highlighting.

**What is left at file level**: metrics, symbols, code, members, surface, dependencies, chain, rules and migration are there. Edge kind and editor choice in settings remain.

**Verdict**: [ADR 0068](../../adr/0061-0070/0068-la-ficha-abre-el-editor-y-sus-dependencias.md), done. Settings and visual polish come next, little by little.
