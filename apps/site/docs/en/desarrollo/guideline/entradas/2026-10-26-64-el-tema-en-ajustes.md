---
title: The theme, in Settings
date: "2026-10-26"
category: feature
verdict: idea
---

**What it is**: choosing the app's theme —light, dark or the system's— in a **General** section of Settings, with the sheets and the frame's four tokens (ADR 0082) as the levers.

**Why**: today there is one theme only: light sheets and a dark frame. Whoever works at night or on a poor screen has no way to change it, and when the system runs dark the browser may force its dark mode onto the page, which flattens the greys and takes the lenses with it: the map's colour and the debt's stop meaning the same thing. A theme of our own keeps the meaning because it picks the colours instead of inverting them.

**What is missing**: deciding where the preference lives —the repository's `.codarch/`, like the rest of the state (ADR 0050), or the app's storage, like the folded sections—; whether the desktop's theme follows the operating system or is chosen separately; and how each pair's contrast is checked, by hand with fixed values or with a tool that measures it. That last one decides whether a styling or contrast dependency comes in, or whether writing the ratios next to the tokens is enough.

**Size**: one Settings section, three options and a copy of the palette. The expensive part is not the selector: it is the whole second theme, with its sheets, its lines and its accents checked against the new background.
