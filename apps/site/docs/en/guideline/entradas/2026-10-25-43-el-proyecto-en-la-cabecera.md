---
title: The project, in the header
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: three layers saying the same thing before the map. The header showed the project name, the stage repeated it in an `h1` with a **MAP** eyebrow that added nothing, and next to it four figures —files, folders, area and debt— sat on another row. All told, the map started more than a hundred pixels down. And the file card's metrics table, already free of duplicates, still took twenty rows even when all you wanted was the risk.

**What changed**: a 52 px band attached to the header, with **Project** and its figures. The name appears once, the header keeps the source, checksum, commit and live state on one line, and the focused folder's breadcrumb moves into the band. The **MAP** eyebrow and the stage `h1` are gone, and the stage tabs only render when there are plugin views to choose. The map starts about 50 px higher. A collapsible section is born too: bold title, count, chevron and a summary with the risk when closed. **Metrics** is the first one; it remembers its state in local storage, so it survives switching tabs, files and sessions. It works with the keyboard and announces what is underneath with `aria-expanded` and `aria-controls`.

**Numbers**: the band is 52 px and the stage saves about three quarters of the old heading. On `apps/mcp/src/tools.ts`, open it shows the same twenty rows and closed it fits in one line with "Risk 54/100". `cc.json`, the checksum and the report do not change: this is reading and layout.

**Verdict**: [ADR 0061](../../adr/0061-0070/0061-el-marco-del-proyecto.md), done. Its roadmap keeps bringing the component to Rules, Changes and the rail, and a shortcut to collapse everything.
