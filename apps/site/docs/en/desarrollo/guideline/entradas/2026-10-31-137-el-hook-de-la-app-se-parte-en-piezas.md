---
title: "The app hook is split into pieces"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**What it was**: `useCodarchApp` was the only function in the repo above 400 body lines —**770** as
measured by the parser— and the third longest on the map. Inside lived things with rules of their own:
what the three selectors offer, what of a shared link can be applied, what each gesture selects, what
a plugin wants to paint and what comes back when returning to the code map. All of it read inside one
hook and could not be tested without mounting the app.

**What changes**: eleven pieces in `packages/ui/src/app/`, each with its rule and without React where
possible. `selectors.ts` decides the metric, area and colour options; `applyView.ts` turns a view
state into a plan that can be applied; `selection.ts` fixes what picking a file leaves and which
selection applies when the model changes; `pluginViews.ts` builds a plugin's views and context;
`bridges.ts` turns off the doors a platform does not have; `detailFor` says which subtree gets pruned;
`planMapSwitch` decides area and colour on a map switch. The hooks that use them —`derived`,
`useSelection`, `viewOptions`, `pluginBindings`, `restore`— are the glue. The hook drops to **501
lines** and its function to **451**; what is left is state, wiring and the object the app returns.

**Why this way**: a 770-line hook cannot be tested without a renderer, and the app has none in its
tests. Moving the rules into pure functions lets each one be tested alone —46 new cases, six new test
files and two that already existed— and leaves the hook with what cannot be moved: React state. It was
not split by size but by responsibility: what changes for the same reason stayed together.

**Verified**: `useCodarchApp` goes from **770 to 451** function lines by the parser's measure, and the
repo still has **0 files with findings out of 511 measured** and **0 cycles** across 520 files. A
smoke test mounts the hook with an empty platform and checks what it answers without a snapshot.
Typecheck, lint and the whole suite green: **160 files, 1371 tests**.

**Verdict**: fix.
