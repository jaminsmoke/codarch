---
title: "Atlas labels and flies"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: Atlas already had containers and rooms, but entering a folder changed the scene at
once and there was no way to know which box was which.

**What changes**:

- **Labels** over containers and sheets, with a background and collision so they do not overlap.
  Folders are drawn first; sheets after.
- **Camera flight** when entering a container: the camera moves closer and then switches to the room.
- **Flight back** from the breadcrumb, with the Back button.
- The selected file's label is highlighted.

**Why this way**: without labels, 3D reads but does not navigate; without flight, entering a folder is
a cut. The flight is not yet a continuous geometry morph, but it already gives the missing movement.

**Verified**: the overview shows `apps`, `packages`, `scripts`, `plugins/atlas` and the root sheets;
clicking `scripts` flies the camera and opens its room with 16 sheets. No console errors.

**What is missing**: the file viewer when clicking a sheet and the geometry morph between scales.

**Size**: label projection in `camera.ts` and `scene.ts`, the label canvas in the view and the flight
in `scene.ts`.

**Verdict**: done.
