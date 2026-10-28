---
title: The map stops writing names that do not fit
date: "2026-10-28"
category: fix
verdict: arreglo
---

**What it was**: every block in the map wrote its name from two pixels of side. In this repository that was **449** labels for 405 files, and in **169** the type came out below six pixels; in **42** not even four letters fitted per line, so a file like `symbols.ts` read `symb / ols / .` and a `chartreuse.test.ts` in a narrow cell broke into two-letter columns.

**What it is**: `labelFor` now requires a type of **6** and **five** letters per line; if the block cannot hold that, it carries no name. The map goes from **449** labels to **218** and none falls below those two minimums. The cut uses both sides: the short one sets the letter size and the long one says how many fit.

**Why like this**: the old rule justified itself by saying that zooming makes it readable. That is not true for a name: zoom enlarges the cell and its text equally —the type is measured in map units—, so a block that only held three letters holds them zoomed in too, just bigger. A name split into three letters does not become readable by zooming, and in exchange it fills the map with smudges. The SVG the CLI generates was already stricter —44×13 and ellipsis—; this brings the app closer to that rule without losing the wrapping that big blocks do use.

**How it is checked**: nine cases in `packages/ui/test/labels.test.ts` pin the rule —a twenty-pixel square carries no name, a 44×15 one does—. In the app running against the repo, the map draws **218** labels, none below 6 px or five letters per line, and big blocks (`analyze-core.ts`, `serve.ts`) still break their name in two lines as before.

**Verdict**: done. If the map ends up short of names, the dial is two constants —`MIN_SIZE` and `MIN_CHARS`— and both are tested.
