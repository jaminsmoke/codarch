---
title: The app's theme
date: "2026-10-26"
category: feature
verdict: adr
---

**What it was**: one theme, light sheets and a dark frame. [ADR 0082](../adr/0081-0090/0082-el-marco-de-la-app.md) put the frame colours into four tokens and left the theme for its own phase; [entry 64](2026-10-26-64-el-tema-en-ajustes.md) left the questions open. Whoever works at night had no way to dim the paper, and with the system in dark mode a browser can force its automatic dark mode over the page, which flattens the greys and takes the map's lenses with it.

**What it is**: **Ajustes › General**, the dialog's first section, with three options —**Claro**, **Oscuro** and **El sistema**—, and a second full palette in `styles.css`. [ADR 0084](../adr/0081-0090/0084-el-tema-de-la-app.md) settles what was missing: the preference belongs to the machine (`localStorage`, key `codarch-theme`), not the repository; «El sistema» resolves to light or dark before painting, and the CSS only handles one case, `data-theme` on `<html>`; and the colours with meaning —the map's tiles, the languages, the migration states, a diff's green and red— are not touched.

**Why this way**: inverting the page with a filter, or leaving it to the browser's dark mode, is what breaks the lenses: a theme of its own chooses the colours instead of flipping them. The frame does not lighten in dark; it darkens to near-black, because it is still the edge. And what is drawn on the paper —the grid, the folder edges and their label— moves to tokens so it does not vanish.

**How it is checked**: in the browser, with the system in dark, the app starts dark; picking Claro and reloading keeps it light —the first paint already uses the stored theme, because both apps apply it in their `main.tsx` before mounting React—. `packages/ui/test/tema.test.ts` measures the dark palette: ink 14.9:1, muted 6.6:1, accents between 7.0 and 9.1:1 and states between 7.2 and 9.3:1 over paper, panel and sheet, and the frame icon 7.4:1. On the way, the light theme's muted ink goes up to #5f6d76 (5.0:1 on the panel; 4.4:1 before).

**Verdict**: ADR 0084, with no new phase. The web app and desktop screenshots are redone in both themes, Ajustes › General included.
