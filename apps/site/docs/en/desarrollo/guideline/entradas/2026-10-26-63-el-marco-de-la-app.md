---
title: The app frame
date: "2026-10-26"
category: fix
verdict: adr
---

**What it was**: the inspector's activity bar (ADR 0079) had the colour of the sheets. Between the light sheet and the window edge there was a 44 px strip that did not say whose it was: the frame —header and project band— stopped at the corner, and at a glance the strip read as a leftover of the panel. The frame colours, besides, were written by hand in every rule.

**What changed**: the bar shares the header's colour (`--frame`, #121a20) and the seam with the sheet is the same 1 px rule the header carries at the bottom (`--frame-edge`), so the frame closes along the right edge. The project band keeps its own tone: it is a band of figures, not the app's border. On dark the states flip —#93a2a8 at rest, white on hover, the active one with 10% white and the inner mark in light—, and the "uncommitted changes" dot stays as it was. The frame colours become four tokens (`--frame`, `--frame-ink`, `--frame-muted`, `--frame-edge`) that the header uses too: a new theme will be four values. No accent is touched, nor the bar's width, nor its 32 px buttons.

**Numbers**: measured in the served app, at 1400 × 860: the bar runs from 116 to 860 —744 px, from the band's edge to the bottom— with #121a20 behind it and the seam in #05090c; contrast is 6.6:1 at rest, 15.9:1 on the active section and 4.7:1 on the red dot. The header does not move a pixel: it uses the tokens with the values it already had. No new dependencies and no change to the model or the API.

**Verdict**: [ADR 0082](../../adr/0081-0090/0082-el-marco-de-la-app.md), done. It leaves open the theme in Settings → General —noted as an idea— and the captures that show the inspector.
