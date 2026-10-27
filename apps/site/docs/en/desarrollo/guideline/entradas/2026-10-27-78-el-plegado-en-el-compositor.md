---
title: Folding, on the compositor
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: folding and unfolding the sheets of both docks was a `display: none`: correct and cheap, but abrupt. The temptation was to animate the sheet's width so the map grew with it.

**What it is**: each sheet leaves with a **140 ms** fade —opacity and an 8 px shift towards its bar— and comes back the same way. The map's width changes **once**, in the same gesture, and the sheet fades over it. With `prefers-reduced-motion: reduce` the change is abrupt again, and below 1180 px too, because there the sheets stack and folding them removes height.

**Why this way**: animating the width would have looked better and performed much worse. The map recomputes its treemap on every size change: `npm run bench:render` gives **an 18 ms median with 5,000 files** to build the model and lay it out, so a 140 ms animation would have asked for that work on every frame and dropped frames precisely in the large repos that notice it most. No animation library is needed: the browser already interpolates opacity and `transform` on the compositor, and the layout change is paid once. The sheets stay in the DOM so they can fade, and `inert` takes them out of focus and the accessibility tree while folded.

**How it is checked**: in the served app, folding takes the stage width from 651 to 953 px in a single value sampled per frame while the sheet fades out; `inert` and `aria-hidden` end up `true` and the bar keeps `aria-expanded="false"`. Unfolding returns to 651 and the sheet comes in from opacity 0. At narrow widths, `display: none` with no transition.

**Verdict**: an amendment to ADRs 0079 and 0083, with no new dependency and no phase.
