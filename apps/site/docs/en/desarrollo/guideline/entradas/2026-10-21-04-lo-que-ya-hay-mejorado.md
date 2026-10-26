---
title: What already exists, improved
date: "2026-10-21"
category: fix
verdict: arreglo
---

These are **not** phases: they are fixes. They live here so they are not lost.

### The API promises things the app does not do (done)

The contract declared sidebar panels and plugin color modes, and **the app did not paint them**.
That is a promise that is not kept, and the worst thing about a promise that is not kept is that
someone repeats it.

**Done**: the contract now promises **views only** (a tab in the central map), which is the only
thing the app knows how to do. Panels and color modes will be added **when the app knows how to
paint them**, not before. ADR 0028 says so, so whoever writes a plugin does not go looking for them.

### The symbol diff does not know about renames yet

The diff matches by name; chains do recognize renames. The PR comment could say "you renamed
`parseDiff`", and it does not say it yet.

**Verdict**: **fix**, no phase. The machinery already exists (chains): it just has to be
connected.

### A move with a change at the same time breaks the chain

If a function moves **and** changes its body at the same time, the chain breaks (a rename requires
the same hash). It is the honest limit we chose, but it is a real case.

**Verdict**: **do not fix it yet**. Loosening the rule would create false chains, which is worse
than a broken chain. A "probably the same" signal can be added later —and it would be done in the
diff, not in the chain.

### The web does not compare two moments

The CLI does (`codarch history --from --to`); the web app has the timeline but not the comparison.

**Verdict**: **fix** or nothing. It is not urgent: the timeline already gives the context.

### The layout: the map grew the page (done)

`.map-frame` had no bounded height → the SVG grew with its own aspect ratio → the whole page
scrolled and the rail, which had `overflow: auto`, never scrolled.

**Done**: at wide width the app fills the screen (`100dvh`), the rail and the inspector scroll on
their own and the map fits whatever is left. At narrow width (where the inspector stacks) the map
fills the screen and the page only scrolls for the inspector.

And with that, **zoom**: `+`, `−` and `Fit` buttons, plus the wheel (which zooms centered on the
pointer). The map layout does **not** change: what changes is the visible rectangle, so zooming in
is free.

### The map: names were not visible (done)

Two bugs that had been there from the start and only showed up by looking at the screen:

1. **The text was inside the `<rect>`**. In SVG a `<rect>` accepts no children → the text was
   always drawn at **zero size** → file and folder names were **never** visible. Now the text is a
   sibling of the rect.
2. **The frame was not measured**: the `ResizeObserver` never fired → the map was always drawn for
   1400×900 and scaled to half → 10.5 px text became 5. Now it is measured on mount, the frame is
   observed and it is measured on resize.

**Done**: the names are readable ("App.tsx", "PrPanel.tsx", "APPS").

### Block names (done)

It started badly: the name was painted as separate text and how much fit was computed by hand. It
came out clipped ("analy…"), it overflowed and small blocks were left without a name.

**The final approach**: the name **belongs to the block**. Each block carries a `foreignObject`
with HTML text inside and it is the **browser** that wraps and clips it. So it **cannot overflow the
block**, by design, whatever the name says.

The only thing decided in code is what the browser cannot guess:

- **The font size**, from the block's short side (4 to 11 px).
- **Whether it goes vertical** (`writing-mode: vertical-rl`) when the block is tall and narrow.
- **Whether the block has room for anything**: below two pixels there is nothing to show.

Measured on this repo's map: **215 labels**, **none overflowing** and **85 vertical**. The ones
left without a name are one-pixel blocks, where not even a letter fits.

### The 3D view: the boxes have no labels

With 200 boxes you cannot tell which is which.

**Verdict**: in the plugin's guide.

### Addon rules reach the MCP

An addon can contribute rules (declarative) and the app sees them, but the MCP did not, because it
reads the snapshot and the rules live in the configuration.

**Verdict**: **fixed**. The MCP reads the configuration the way the CLI does: `get_project_config`
returns the profile, the layers, the rules with their origin (`config`, `profile` or
`addon:<name>`) and the declared addons with their saved views.
