---
title: Finding the way home in the map
date: "2026-10-25"
category: fix
verdict: arreglo
---

**What it was**: once you entered a folder the map stayed there and only Escape knew the way out. The project band showed the whole path at once —"Todo / packages/parsers/test"— with a single button back to the start: no one level up, no middle step. And the stage foot repeated what was already above —"N files · M folders · cc.json 2.0"— next to zoom controls with an "Ajustar" label and the hint "botón derecho: mover".

**What changed**: the crumbs come from the map tree, not from the path string: one step per folder, each one can be opened, the last one is the current folder, and the "←" arrow goes up one level (Backspace does the same; Escape leaves the folder entirely). The first crumb is still "Todo" and returns to the whole map. The foot keeps the zoom and nothing else: "− 100% +" and a fit icon; the right-button hint moves to the group's tooltip and the file, folder and format count disappears, because it is already in the band.

**Numbers**: the band gains one arrow and one crumb per level; the foot loses two texts and goes from three labelled controls to three 19-20 px buttons in a 95 × 22 px box. `folderTrail` and `parentFolder` walk the tree, with their own test; neither `cc.json` nor the checksum change.

**Verdict**: fix, done. No ADR and no model change: the same view, with the way back in sight.
