---
title: The guide's timeline rolls
date: "2026-10-28"
category: feature
verdict: arreglo
---

**What it was**: the guide's day bar did not recognise its own address. The parser looked for the `guia` segment in the first position, so any route —including a specific day's— fell back to the last day and the marked day was never the one in the URL. There was no reel either: the days overflowed. And the line that was meant to go with them was an `h-px` stuck to the block's bottom edge, outside the composition and marking nothing.

**What it is**: the open day always sits in the centre and the rest is a reel. Its neighbours sink with distance —opacity, blur and scale— and the ones further out dissolve into fog, which also fades the edges. The reel can be dragged with the pointer and, on release, it keeps rolling with the gesture's speed, slows down and settles on the nearest pill; only then does that day open. The track is a 2 px rail under the pills, tinted rust up to the open day and grey ahead, with a 2 × 8 px marker pointing at it: it travels with the strip, not with the window, and comes and goes with the same fog.

**Why this way**: the physics live on their own, in [`apps/site/src/lib/carrete.ts`](https://github.com/jaminsmoke/codarch/blob/main/apps/site/src/lib/carrete.ts), so it can be pinned down with tests instead of tuned by eye. Speed comes from the last 120 ms of the gesture and is projected 150 ms further, capped at 280 px: a short flick covers one or two days and a long one does not run away. The magnet takes 260–480 ms depending on the distance, with a spring curve that overshoots a hair before settling. Releasing after a pause is not a flick —old samples are dropped against the release instant—, and during the flight the reel takes no pointers, so a second gesture cannot cut it short. Navigation waits for the settle because the immediate jump was what made a gesture read as a cut.

**How it is checked**: `apps/site/test/carrete.test.ts` covers speed with its window and caps, the inertia, the magnet's tie and the flight duration (11 cases); `apps/site/test/guia.test.ts` keeps the route reading the `guia` segment wherever it sits (24 cases). In the browser: the open day lands 0.3 px from the centre and the marker 0.1, on desktop and at 390 px wide; a short drag returns to the centre in about 140 ms without navigating; a release after a pause settles one day over rather than two; and a plain click still opens the day instantly. What could not be measured was a real fast flick: with the tab in the background the browser clamps its timers to one second.

**Verdict**: a fix, with no phase and no ADR. The day bar reads the route now and the reel has its physics measured; if it overshoots in use, the numbers that govern it are at the top of `carrete.ts`.
