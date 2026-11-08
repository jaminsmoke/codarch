---
title: "Atlas enters folders"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: Atlas drew the whole map and selected files, but clicking a folder only changed the
app focus; the camera stayed on the full atlas.

**What changes**: clicking a folder centers the Atlas camera on its volume and moves closer. A breadcrumb
appears inside the view and a **Back** button returns to the whole map. If focus changes from the app's
path, Atlas follows the same route.

It works on both maps and keeps the selection and the rest of the state. Focus still belongs to the
app: Atlas does not keep a second truth.

**Why this way**: entering a folder is the first gesture that turns Atlas into a map instead of just an
aerial view. The breadcrumb and the back button prevent getting lost.

**Verified**: opening `packages/ui` focuses its volume, shows the breadcrumb and the Back button;
pressing it returns to the full atlas. No console errors.

**What is missing**: the animated transition, labels, file detail and corridors.

**Size**: camera focus in `orbit.ts` and `scene.ts`, the breadcrumb and button in the view, and the
`findVolume` test.

**Verdict**: done.
