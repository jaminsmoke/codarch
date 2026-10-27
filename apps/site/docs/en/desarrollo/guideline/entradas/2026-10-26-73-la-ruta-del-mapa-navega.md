---
title: The map's path navigates
date: "2026-10-26"
category: feature
verdict: adr
---

**What it was**: the folder path lived in the project band, next to the name and the figures, and only showed up with a folder focused. To go back up you had to find it far from the map it navigates. Separately, we tried opening the whole file in a **Código** tab of the stage on double click: it worked, but mounting a thousand highlighted lines left multi-second long tasks and the app felt frozen going in and out.

**What it is**: the path moves to the **stage**, above the map, and is **always** there: with no folder focused it says `Todo` as the current place and, once focused, every segment —`Todo / packages / ui / src`— is a button that navigates; the arrow goes up one level. The **Código** tab and its double click are gone: the stage has a single view again, and tabs are back to being the place for plugin views ([ADR 0085](../adr/0081-0090/0085-la-ruta-del-mapa-navega.md)).

**Why this way**: in the real app, opening the whole file cost a **6.6 s** task when resizing the window and 88–148 ms when switching, measured with `PerformanceObserver`; highlighting itself is 20 ms per 1558 lines, so the cost is the size of the block, not Prism. Fixing it needs splitting the painting up, which is separate work. The path, meanwhile, is what gets used daily to move around: putting it where you look and making it clickable is cheap and removes an excuse to have two views.

**How it is checked**: with the repo open, the whole map shows `Todo` as the current place; focusing `packages/ui/src` shows `← Todo / packages / ui / src`, clicking `ui` goes up to that folder and **Todo** returns to the whole map; only `focus` changes in the URL. No tab shows in the stage unless there are plugin views. `packages/ui/test/viewState.test.ts` still covers `focus` in the URL.

**Verdict**: ADR 0085, with no new phase. Measuring and virtualising the painting of a large sample stays open before offering the whole file again.
