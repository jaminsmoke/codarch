---
title: "Back-wall sign and the real project name"
date: "2026-11-09"
category: "feature"
verdict: "adr"
---

**What it was**: the front beam held the room name. The root room was called `Proyecto`, even though
it represents the analysed repository.

**What changes**:

- The front beam is removed and the front is completely open.
- The name moves to a sign centred on the back wall, with a dark plate, frame and centred text.
- The root room uses `RenderModel.meta.project`; `Proyecto` is only a last fallback.
- The sign has priority over labels and is not selectable.

****Why this way**: the name belongs to the wall, not to a piece hanging in front of the camera. The
root has to say which project is being viewed.

**Verified**: in Chrome, the root shows `codarch` on the back sign and `src` in its room; no beam, no
console errors.

**What remains**: angle LOD and lighting polish. The animated door is still for later.

**Size**: `room.ts`, `view.tsx`, `scene.ts`, tests and documentation.

**Verdict**: done.
