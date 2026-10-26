---
title: The callouts get their box back
date: "2026-10-26"
category: fix
verdict: arreglo
---

**What it was**: the documents write their callouts as `:::note` and they came out as a loose paragraph. It was not the Markdown: the documents live in `docs/`, not in `src/content/docs` (ADR 0046), and Starlight only transforms the folders it knows —its collection and the ones added to it—. Without them, its `remark` plugins skipped every file and both the callouts and the heading anchors were lost without a word: the page still painted, only without the box.

**What changed**: Starlight's config now declares `markdown.processedDirs: ["./docs"]`, the documents' real folder. And the Markdown processor —our own, to rewrite links— gains `remarkRehype.passThrough: ["element"]`: callouts arrive as hast nodes inside the mdast tree and, without it, `remark-rehype` wrapped them in a `div`. Both failures were silent and both are now in `contenido.test.ts`. There is a third, quieter one: Starlight picks the language of its translations from the file's path inside `src/content/docs`, so here it always concluded Spanish and the English pages labelled their callouts “Nota”. `rehype-idioma.mjs` puts it back: it sets the default label of the callouts and the one on each section's link —“Sección titulada” and “Section titled”— in the file's language, and respects whatever title the document writes. It runs at the end of the pipeline, once Starlight has mounted both.

**The shape**: the callout takes the house's shape instead of Starlight's —3 px hairline, 8% tint of the same tone, 8 px corners and the eyebrow in the mono small caps of the language codes—. The four tones are the site's palette —cobalt, patina, ochre and debt—, not Starlight's blues, which appear nowhere else. On the way, headings come wrapped by Starlight to hang their anchor: h2, h3 and h4's air and scale move to the wrapper and the heading keeps no top margin, so the two do not add up.

**How it is checked**: in the browser, `/docs/usar/mcp/` paints both notes with the cobalt hairline, the 8% tint and the mono eyebrow, and headings carry their anchor on hover; in light and dark the text stays the ink and the icon the tone. The build leaves the callouts in both languages and `contenido.test.ts` watches `processedDirs`, `passThrough` and the Markdown links.

**Verdict**: a fix, with no ADR. It is a pipeline you cannot see until it is missing.
