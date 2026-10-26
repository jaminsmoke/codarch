---
title: The guide's voice, in the documents
date: "2026-10-26"
category: fix
verdict: arreglo
---

**What it was**: the guide is the project's written reference —display type in headings, 16 px text at 1.65 line-height, 72 characters to the line, `#c8d1d5` hairlines, tables with every cell drawn— and the documents carried Starlight's scale: a 42 px h1 in the sans, a 35 px h2, a 29 px h3, paragraphs at 28 px line-height and tables drawn with the bottom line only. Moving from one zone to the other changed the product: the documents' h1 was not even in Bricolage.

**What changed**: the page title (`h1#_top`) becomes Bricolage 700 at `clamp(2rem, 3.2vw, 2.6rem)`, with 1.05 line-height and −0.025 em tracking, like the guide's. h2s drop to 1.4 rem and open the section with the guide's hairline —0.6 rem of padding and 2.6 rem above—; h3s to 1.05 rem and h4s to 0.96. The text takes 72 characters to the line at 1.65 line-height with 0.9 rem between paragraphs, links go in the reading rust with a 1 px underline (2 on hover), loose code at 8% ink with 4 px corners and quotes at the 3 px hairline and 5% tint of the guide's lead-in. Tables debut the full 1 px cell with `th` over the house panel —`#f6f8f8`, `#161e24` in dark— and 0.4 × 0.6 rem of padding. Code blocks, which came with one-pixel corners, go to 8 px.

**How it is checked**: `contenido.test.ts` reads both sheets and compares the numbers —h2, h3, table, loose code, 72ch and the 1.65 line-height—, so a change in one that leaves the other behind fails. Measured in the browser, the h1 lands at 41.6 px on desktop and 32 on mobile, the line-height at 26.4 px, the table takes the content's width without overflowing and the `th` reads on its panel in both themes.

**Verdict**: a fix, with no ADR. The scale was already written in `styles.css`; this takes it to the other family of pages.
