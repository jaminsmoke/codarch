---
title: "The capture's lettering"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: the map's PNG was a board of coloured boxes and, underneath, a summary with the twelve names. You could see where the bulk was, but to know which box was which you had to cross positions with a list, and a capture on its own —pasted in a chat, in a PR— could not explain itself.

**What it is**: the capture labels the large files and the folders with a 5x7 bitmap font written in `packages/render/src/font.ts`: capitals, lowercase, digits and the signs of a path. There is no installed font to load and no type rasteriser to ask anything of: every glyph is a grid of bits and every pixel of the glyph is a 1 or 2 px square. The lettering was first asked for in capitals only —twice the glyph count with half the table— and it was changed after looking at it: a path in capitals is a shout and `useCodarchApp.tsx` stops being that file.

**Why like this**: the thresholds are the SVG's, so the PNG and the screen say the same: 44x13 for the first line, two lines —name and extension— when the box has room for them, and a folder's header only when the layout has reserved it. What does not fit is cut with an ellipsis; a slot that cannot even fit the cut stays unlabelled, because three dots in six pixels say nothing. The ink comes from `inkFor`, the same the app uses: the name reads as well over a high risk as over a low one.

**The detail that nearly slipped through**: `textWidth` counted UTF-16 units, so an emoji in a path measured twice what it occupies and ate the room of two letters. It now counts characters, and a character with no glyph leaves its blank slot without shortening the line. The font's test found it, not a capture.

**How it is checked**: `packages/render/test/font.test.ts` covers the whole set —capitals, lowercase and digits have a glyph, with ink and seven rows—, that lowercase is not the capital, the blank slot of an unknown character, the measurement with and without the trailing gap, the cut with ellipsis and that two passes give the same. In `shot.test.ts`, two maps that only change the name of their single file give different bytes, and the same name gives the same bytes: that proves the lettering reaches the pixels. Suite **1,094** cases and **134** files, `tsc` clean and lint with no errors. This repository's capture goes from 28 KB to 46 KB.

**Verdict**: phase M62 closed: the image says the names and the summary says the numbers. What remains is the usual question mark —how many labels fit before the map becomes noise— and that is answered by looking at captures of large repos, not here.
