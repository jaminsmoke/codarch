---
title: "The project sheet's captures"
date: "2026-10-30"
category: "docs"
verdict: "arreglo"
---

**What it was**: the **Proyecto** sheet capture predated the redesign and showed exactly what the section no longer says: the six-row Métricas list and, in Reglas, `24 reglas activas · 22 errores · 2 avisos`. Whoever read it concluded the repo had 22 errors when lint was clean. There was no capture of **Métricas** on its own either, so the section whose format changed had nowhere to be seen.

**What changes**: two new images in `docs/images/`. `webapp-inspector-proyecto.png`, 1920×1200 and light theme, with the sheet open and the third icon lit in the activity bar: the full Métricas table with its coverage, lint with its three counts and Reglas with `eslint` and `oxlint` measured. `webapp-inspector-metricas.png`, 600×1746 at scale 2 —the cropped panel—, with the whole section: the snapshot's 19 metric rows, the highest complexity with its file and lint with its per-folder breakdown. The second goes into the **Métricas** paragraph of `usar/webapp` and `en/usar/webapp`, with the alt text in each page's language; the first replaces the old project capture.

**Why this way**: a capture is documentation and cannot show data the product no longer gives. The scale-2 crop of the panel is the only way the table's detail stays readable on the web without turning the capture into a whole app.

**Verified**: both images were taken from the app under `web:dev` with this repo's real snapshot —501 files, 19 metrics, 0 findings— and reviewed at full size; the site build processes them and both language pages reference them.

**Verdict**: fix.
