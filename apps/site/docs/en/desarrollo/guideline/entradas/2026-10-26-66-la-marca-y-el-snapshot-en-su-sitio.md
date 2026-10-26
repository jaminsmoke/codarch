---
title: The mark and the snapshot, in their place
date: "2026-10-26"
category: fix
verdict: arreglo
---

**What it was**: in the header, "CODARCH" and "ATLAS DE ARQUITECTURA" sat side by side, with no icon and the tagline taking width; the snapshot —the source and the two checksums— and the watch indicator sat in the middle of the header, which belongs to the app and not to the open project; and the settings gear, just moved to the tool bar, was a filled drawing that at 16 px read as a blob with no hole.

**What changed**: the mark is the app's icon drawn in SVG —the map in miniature, with its debt piece in the corner— and next to it the name, with the tagline below, on two lines. The snapshot and the watch indicator move down to the project band, next to the project's name: `servidor local · 82de566a · 96cbb3b6 ● live`, with whatever does not fit clipped and the whole string in the `title`. The gear is now an eight-tooth silhouette filled with the hub cut out of it —two subpaths wound in opposite directions— so at 16 px the centre hole shows.

**Numbers**: the header goes from a grid to a flex row: the mark on the left and the actions on the right, no middle column. The project's name does not shrink —the snapshot yields, with its ellipsis— and at 777 px the tagline and the snapshot hide, with the band still not overflowing (759 of 759). No change to the model or the API.

**The icons**: the header's mark, the web app's favicon, the site's favicon and the desktop icon all come from the same geometry, `packages/ui/src/brand-mark.json`, which the icon generator reads (`npm run icons`): the desktop's 512 px PNG —where electron-builder turns it into the `.ico` and the `.icns`—, the web app's `icon.png` for the home screen and the favicons in SVG, crisp at any size. The PNGs are drawn with supersampling, so the rounded corner no longer staircases. A test compares the favicon's `rect`s with the JSON: if someone edits a copy by hand, it fails.

**Verdict**: a fix, with no phase and no ADR. Checked in the served app: the mark is 22 px with the name on two lines, the snapshot sits next to "codarch" in the band, the new gear leads the foot of the bar, and at 1000, 900 and 777 px the project name is not clipped and the band does not overflow.
