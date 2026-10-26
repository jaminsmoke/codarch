---
title: The inspector with an activity bar
date: "2026-10-26"
category: feature
verdict: fase
---

**What it was**: the right panel chose between **File** and **Changes** with two text tabs in its header. With two it fit; as the panel grows, it does not: the strip lived inside the scrolling `aside`, so scrolling a long sheet took the only control for switching sections up and away, and every new section charged width to the content in 302 px.

**What changed**: a 44 px activity bar against the right edge, outside the scroll, with one icon per section. **File** and **Changes** are still the same (`tab=file|changes`), but they are chosen from there; the "uncommitted changes" dot rides the Changes icon, and every entry carries its `title` and `aria-label`. The bar is a data list (`INSPECTOR_SECTIONS`): adding a section is one entry and its sheet, not a change to the shell. On narrow screens it lies down into a row above the sheet.

**Numbers**: the panel keeps its 302 px because the bar has its own lane (a 346 px column); `.tabs`/`.tab`/`.tab-dot` go and `.inspector-dock`/`.inspector-bar`/`.inspector-tab`/`.inspector-dot` arrive. The API is unchanged: the state is still `tab` and `setTab`, and old names (`rules`, `lenses`, `pr`) are still read. The bar is a `nav` with `aria-current`, not a `tablist`: it does not promise arrow keys it does not implement.

**Verdict**: [ADR 0079](../../adr/0071-0080/0079-el-inspector-con-barra-de-actividad.md), done. Checked in the served app: two icons with their names, `aria-current` on the active section, the dot on Changes; scrolling 591 px leaves the bar exactly where it was, switching icons updates `tab=` and the panel's name, and at 700 px the bar lies down into a 44 px row above the sheet.
