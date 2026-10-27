---
title: Folding, on the compositor
date: "2026-10-27"
category: feature
verdict: adr
---

**What it was**: folding and unfolding the sheets of both docks was a `display: none`: correct and cheap, but abrupt. The temptation was to animate the sheet's width so the map grew with it.

**What it is**: each sheet leaves with a **140 ms** fade —opacity and an 8 px shift towards its bar— and comes back the same way. The map's width changes **once**, in the same gesture, and the sheet fades over it. With `prefers-reduced-motion: reduce` the change is abrupt again, and below 1180 px too, because there the sheets stack and folding them removes height.

**Why this way**: animating the width would have looked better and performed much worse. The map recomputes its treemap on every size change: `npm run bench:render` gives **an 18 ms median with 5,000 files** to build the model and lay it out, so a 140 ms animation would have asked for that work on every frame and dropped frames precisely in the large repos that notice it most. No animation library is needed: the browser already interpolates opacity and `transform` on the compositor, and the layout change is paid once. The sheets stay in the DOM so they can fade, and `inert` takes them out of focus and the accessibility tree while folded.

**How it is checked**: in the **production build** served by `codarch serve`, at 1600 × 1000 and 120 Hz, with `PerformanceObserver` for `longtask` and `long-animation-frame`: 8 folds of the inspector and 6 of the left dock give **one width per gesture** (949 ↔ 1251 px and 949 ↔ 1207 px), an 8.3 ms median between frames and an 8.5 ms p95. Each gesture drops **one** frame (25–42 ms), with no `longtask` and no `long-animation-frame`; the idle baseline drops none. That is the treemap recomputation, paid once. In the development app, `inert` and `aria-hidden` also end up `true` when folded and the bar keeps `aria-expanded="false"`; at narrow widths, `display: none` with no transition.

**Verdict**: an amendment to ADRs 0079 and 0083, with no new dependency and no phase.
