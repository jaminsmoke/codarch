---
title: "The folder was the only thing you could not select"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: a click on a file in the map selected it for the ficha and a double click opened it in the stage. A click on a folder zoomed in and closed the selection. The result is that the folder —what you look at first in a treemap— was the only thing in the map you could not select: inside `packages/ui`, with no file open, the right panel said "Selecciona una celda", as if there were nothing to say about where you were.

**What is decided**: [ADR 0092](../../adr/0091-0100/0092-la-carpeta-tiene-su-ficha.md) separates **selecting** from **looking** —`sel` and `focus`— and gives the folder the same gestures as the file: click selects, double click enters (the file to the stage, the folder to the zoom), the breadcrumb selects without moving the zoom and `Enter`/`Space` do the same with the cursor. The activity bar gains a **Carpeta** entry with a sheet of its own —the first attempt shared the file's sheet, and entry [104](2026-10-29-104-la-carpeta-ya-se-selecciona.md) says why that was wrong—, and the folder's ficha shows what the file's cannot: maxima **with their owner**, the composition of its children, the dependency frontier —inside, incoming from outside, outgoing to outside—, cycles that sit wholly inside and cycles that cross it, rules grouped by rule and the changes scoped to the folder in one line that filters the other tab.

**Why like this**: adding up a file's metrics and calling it a folder ficha lies in two places. A maximum without saying which file holds it is not a task, and an edge without telling inside from outside does not say whether the folder is a module or a mess. And today the sums and the maxima are written nowhere: the MCP aggregates in `explain_module` and the app does not, with rules that live only in the MCP's code. They get written once, in a shared module with tests, and the MCP starts using them —the same lesson as [ADR 0091](../../adr/0091-0100/0091-el-mapa-en-una-captura.md), where colour was resolved in one place so the screen and the capture could not paint differently—.

**What it costs**: the plain click stops navigating, which was a decision of [ADR 0085](../../adr/0081-0090/0085-la-ruta-del-mapa-navega.md). Navigation does not disappear: it changes gesture and gains the selectable breadcrumb. In exchange, the selected folder needs a mark of its own, different from the keyboard cursor and the hover, or the click stops saying what is open in the panel.

**Verdict**: phase **M63**, not started. The first slice is the cheap one and the one that changes the feel: `sel` in the state and the URL, folder selection and its three marks. The frontier and the cycles come later, because they are the ones that need the shared aggregation already tested.
