---
title: "The capture of the Carpeta sheet"
date: "2026-10-29"
category: "docs"
verdict: "arreglo"
---

**What it was**: the usage page told the inspector with three entries —Fichero, Carpeta and Cambios— and had a capture for the map, for Fichero, for Cambios and for Ajustes. The Carpeta sheet, which shipped the same day, was described in words only: whoever read it did not see its path, its counts or the content with the share of the area each child takes, which is exactly what the sheet shows.

**What changes**: `docs/images/webapp-inspector-carpeta.png`, 1920×1200 and light theme, with the sheet open on `packages/ui` and the third icon lit in the activity bar. It goes into both pages, `usar/webapp` and `en/usar/webapp`, with the alt text in each page's language and the same treatment as the other captures.

**Why like this**: the same frame and the same size as `webapp-inspector-fichero.png` and `webapp-inspector-cambios.png`, so the three read as siblings when jumping from one to the next; and an interface page is read with a capture, not only with a description of its sections.

**What is missing**: the folder's aggregated metrics, its frontier and its cycles are still on the roadmap of [ADR 0092](../../adr/0091-0100/0092-la-carpeta-tiene-su-ficha.md), so the capture shows the composition and not what does not exist yet.

**Verdict**: a fix.
