---
title: "Closed corners and contained floor"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: the back wall was wider than the side walls and the floor stuck out. The joint showed
at the corners and the room looked assembled from separate pieces.

**What changes**:

- The back wall shares the side walls' outer width.
- Each back corner gets a trim column that hides the joint.
- The floor is adjusted to wall width and no longer sticks out.
- The camera keeps its front arc and distance limit.

****Why this way**: a structure closing at the same corner reads as a room, not loose panels. The column
solves the joint without adding a front wall.

**Verified**: in Chrome, root and inner rooms show continuous corners and contained floor; no console
errors.

**What remains**: lighting, interior composition and the rest of camera focus targets.

**Size**: `room.ts` and documentation.

**Verdict**: done.
