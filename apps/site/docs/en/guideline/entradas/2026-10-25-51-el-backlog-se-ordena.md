---
title: The backlog gets sorted
date: "2026-10-25"
category: docs
verdict: arreglo
---

**What it was**: forty open boxes across sixteen ADRs, and several were the same work written down twice. Filtering rules by severity was in ADR 0058 and again in 0059. "Take this to the MCP" appeared in 0064, 0067 and 0068. Grouping symbols by type had already been done in M43 and was still listed. And the three 3D plugin items also lived in `plugins/vista-3d/ROADMAP.md`. An item that sits in two places gets done twice or never.

**What changed**: the sort-out. Every duplicate now lives in one place — the ADR that owns the concept, or the plugin's roadmap — and the three conditional MCP sentences merge into one: extend it with structure, code and dependencies when an agent asks. Three items are struck because they are already done or covered: grouping symbols by type (M43), import aliases (M44) and collapsing symbols in the symbol's life, which was the new phase once more. Forty boxes become thirty-one, and five of them are a phase.

**The phase**: one, M49, in [ADR 0061](../../adr/0061-0070/0061-el-marco-del-proyecto.md#hoja-de-ruta). The metrics table and the collapsible sections reach **Changes**, **Rules**, the rail and the symbol's life. They were three loose items — one in 0060, one in 0061 and one in 0062 — and they are the same work.

**The fixes**, with no phase and no ADR: searching a rule by severity, source or name (0058); remembering the file section when changing cell (0059); the symbol filter by name (0062); a variable's value in the row (0063); one shortcut to collapse everything (0061); choosing the editor in settings (0068); the watcher's safety net when Windows drops events (0056); the anchoring rule test with subfolders, which closes M34 (0050); and the action smoke, which lives outside this repo (0066).

**The ones that wait** for a decision or a measurement: sharing the cache between desktop and `serve`, measuring churn when a file is added, being able to pause desktop watching (0056 and 0050); the catalogue of rules that are not violated — the report would have to carry it —, symbol-level rules and the file's evolution in the card (0057 and 0058); namespaces and object keys (0064); the edge kind (0068); the imports fold (0060); the root `action.yml` for Marketplace (0066); and the SQLite index, still waiting for volume (0036). The fifty ADRs in English are out of scope: they are M31 and have their own roadmap.

**Verdict**: fix, done. The backlog's order stops being the age of the idea and starts saying what gets done, what waits and what no longer.
