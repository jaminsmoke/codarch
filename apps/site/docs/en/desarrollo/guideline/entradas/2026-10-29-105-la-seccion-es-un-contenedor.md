---
title: "The section is a container"
date: "2026-10-29"
category: "refactor"
verdict: "arreglo"
---

**What it was**: in the file sheet and in the changes sheet, the sections were separated by a 1 px hairline on each header. Every section was a loose list on the panel's paper: the Métricas table, the symbols, the surface and the dependencies had no edge of their own, so the table's border read as the panel's. The app's only container was in the folder sheet, around «Contenido», and it was there by accident: the sheet's list used `.folder-list`, the same name as the folder picker's list, and inherited from it the 1 px line, the sheet background and the 340 px cap.

**What changes**: the top-level sections of Fichero and Cambios are drawn inside the folder's container —the house's line and the sheet's paper— with its padding, and the hairline on top goes away because the edge already delimits. Nested groups keep theirs: a symbol group or a file of a change does separate rows. The folder sheet's list becomes `.folder-content`, with the container written in its own rules, and each row's name becomes `.folder-row-name`; the folder picker keeps `.folder-list` and `.folder-name`, which were its own, and gets its typography back: the 10.5 px mono it was seeing had been left there by the sheet.

**Why like this**: the container is written once in the file sheet and applied to both by the top-level selector, not inside the component, because nested collapsibles would otherwise carry a box and the edges would multiply. And the folder's box is taken out of the loan because a style born in a dialog cannot be the reference for a sheet: it changed the list's height and gave it its own scroll without anyone deciding so.

**What it costs**: each section's header loses the only frontier it had, so the air between sections comes from the margin and not from a line. And the new sections do not carry the folder's height cap: they grow with their content and the sheet scrolls.

**Verdict**: a fix. No behaviour change: the same sections, the same data and the same order.
