---
title: "The folder can be selected now"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: a click on a folder in the map zoomed in and closed the selection, so inside a folder the right panel said "Selecciona una celda" even with forty files in sight. The only way to read anything was to open a file.

**What changes**: the first slice of [ADR 0092](../../adr/0091-0100/0092-la-carpeta-tiene-su-ficha.md) is in the app. The selection lives in its own state and its own URL key —`sel`, next to `focus` and `file`—, and the gesture is the same for a file and a folder: **a click selects, a double click enters**. The breadcrumb selects its step without moving the zoom and enters on double click; "Todo" selects the whole map. With the keyboard, `Enter` enters and `Space` selects. The selected folder has its mark —an ink stroke, thicker than the frame—, distinct from the keyboard cursor (rust) and the hover. And the right panel gains a third entry, **Carpeta**, with a sheet of its own: path, files, depth and content in the treemap's order, with the share of the area each child takes. Selecting a folder opens that sheet; selecting a file, if you were in it, goes back to Fichero.

**Why like this**: `sel` goes in a key of its own beside `file` because `file` has meant "the file" for years and the links already pasted into tickets have to keep opening the same thing. `Enter` enters and `Space` selects because the arrows already move the cursor: the ADR's roadmap said `→` to enter, and that would have clashed with the spatial navigation of [ADR 0085](../../adr/0081-0090/0085-la-ruta-del-mapa-navega.md); it is corrected there. In the breadcrumb, the double click keeps the navigation the click no longer does, with the same rule as the map.

**The sheet is its own, not shared**: the first version put the folder inside the file's sheet, with the subject changing behind the same entry. It was wrong in three places: the two fichas share almost no section, the button promises one thing and shows another, and going back to Fichero with a folder selected left the panel looking empty. [ADR 0092](../../adr/0091-0100/0092-la-carpeta-tiene-su-ficha.md) is corrected: three entries in the activity bar.

**What it costs**: whoever entered a folder with a click now needs the double click, the breadcrumb or the ← arrow. It is paid for with the selection mark, which is what makes it clear the click no longer navigates.

**What is missing**: the folder ficha is half built. The header and the content are there; the aggregated metrics **with their owner** are not, and before them the aggregation shared with the MCP (the maxima and the sums written once), the dependency frontier, the cycles inside and across, the rules grouped by rule and the link that scopes Changes to the folder.

**Verdict**: phase **M63**, in progress. Its first two roadmap steps, done.
