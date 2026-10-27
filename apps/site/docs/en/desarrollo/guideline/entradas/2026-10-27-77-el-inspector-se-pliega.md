---
title: The inspector folds from its own entry
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: the activity bar from [ADR 0079](../../adr/0071-0080/0079-el-inspector-con-barra-de-actividad.md) switched sections but never stepped aside: with a long symbol sheet, the right panel kept its width and the map never got it back. The tool dock on the left did fold from its icon ([ADR 0083](../../adr/0081-0090/0083-el-dock-de-herramientas.md)), and two different gestures for the same kind of panel are badly learned.

**What it is**: pressing the entry that is already on screen folds the sheet and leaves only the bar; pressing it again brings it back. Pressing the other section switches to it without folding. The bar stays there, with its `aria-expanded`, and folding is remembered between visits like a section's. The map gains the sheet's width.

**Why this way**: it is the same gesture and the same memory as the left bar, instead of a new control for the same thing. Folding does not go in the URL: the URL says which section is being read, not how much width it takes, so a shared link never hides the panel from whoever opens it.

**How it is checked**: `toggleInspector` lives in `viewState.ts` and `viewState.test.ts` covers the three cases —fold, reopen and switch sheet. In the served app, pressing **Fichero** twice hides the sheet and leaves the bar, and pressing it again brings it back with the same section.

**Verdict**: an amendment to ADR 0079, with no new phase.
