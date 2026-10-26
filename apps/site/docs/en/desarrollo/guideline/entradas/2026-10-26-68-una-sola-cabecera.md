---
title: One header only
date: "2026-10-26"
category: fix
verdict: arreglo
---

**What it was**: the site had one header for the home page and the guide and another for the documents. The documents' header was the same bar, but inside Starlight's frame, which reserves room on the right for its menu button: the button floated **outside** the bar, the bar was narrower than the page and the theme did not sit next to the language. Inside, Starlight's search asked for `width: 100%` and, sharing a row with the language and the theme, ate their width: the repository link ended up squeezed to 17 px instead of 24. On mobile it showed at a glance: a 448 px bar in a 466 px window. And the side drawer carried its own set of theme and language, two controls for the same thing a hand's width apart.

**What changed**: the menu button enters the bar through a `slot` and stops floating; Starlight's frame loses the padding that made room for it and the bar takes the page's width in both families. Language and theme become a single piece, `barra-preferencias`, with its hairline and 0.3 rem between them. The search gets its own 14 rem width and the rest of the row does not shrink, so every control keeps its size. The drawer's footer —Starlight's `MobileMenuFooter`, with its theme selector and its language— is gone: the header already carries both on mobile too.

**How it is checked**: `barra.test.ts` watches that both layouts mount `<Barra>`, that the frame draws no header, that the search and the menu go inside the bar, that the theme lives in the language's group and that the drawer does not repeat the controls. Measured in the browser, the repository link's box lands on the same pixel on the home page, the guide and the documents.

**Verdict**: a fix, with no ADR. It is the header shape ADR 0081 already decided —one bar for both zones— taken to its end.
