---
title: The sidebar, like the header
date: "2026-10-26"
category: fix
verdict: arreglo
---

**What it was**: the documents had two colour criteria. The header had just been unified —IBM Plex Sans at 14 px, a 0.5 rem pill, a `#c8d1d5` hairline, the active item in rust over a soft tint— and the sidebar kept its own: 16 px, paler hairlines and the active item in solid rust. And there was something worse: in Starlight `--sl-color-white` is the **ink** and `--sl-color-black` the **background**, not two colours, and the tokens were crossed. In light mode that left the sidebar writing pure white on paper —1.14:1, invisible except the active item— and the mobile drawer painted dark inside a light page; the secondary grey sat at 4.37:1, under AA.

**What changed**: both tokens go back to their place —ink and background, in both themes—, which also fixes the drawer, the search dialog and the page's table of contents, which used the same values. The sidebar takes the header's type: 14 px, a 0.5 rem pill, children in grey and zone destinations with their weight; the active item becomes a 12% accent tint with the rust on top, and the children's tree carries the same hairline as the header. The group labels —CLI, Decisions, each ten-folder— debut the mono small caps of the language codes, which marks an eyebrow without competing with the links. The secondary grey drops to `#55626a`, the web's own `--color-muted`.

**How it is checked**: `sidebar-paleta.test.ts` reads the tokens from `styles/starlight.css`, composes the 12% tint over the sidebar's background and measures the contrast of the active item, the links and the labels in both themes; with the old grey, it fails. In the browser, a sweep of every piece of text on the page —content, sidebar, table of contents and pagination— finds no pair under 2:1 in light or dark, and the mobile drawer now paints with the theme's paper.

**Verdict**: a fix, with no ADR. The shape was set by entry 68; this is the same bar applied to the sidebar.
