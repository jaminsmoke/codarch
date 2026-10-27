---
title: A single local store
date: "2026-10-27"
category: refactor
verdict: arreglo
---

**What it was**: preferences and plugins were read and written by four functions **copied literally** into the web app and the desktop, and each one's private `getStorage()` was a third copy of the `localStore()` that already lived in `packages/ui`. The parts around them had already diverged: the shape guard for a saved project was written twice —the web forgot the `addons` when reading, the desktop left them as `[]`— and the keys were loose literals in both modules.

**What it is**: `@codarch/ui/storage` is the machine's store: the keys (`codarch.preferences.v1`, `codarch.plugins.v1`, `codarch.project.v1`), the preferences, the plugins, the `parseSavedProject` guard and the reads and forgettings by key. Each app keeps what is its own: the web, the project in `localStorage` with its size cap and its habit of forgetting the one it cannot parse; the desktop, the last repo's root and the previous version's project to migrate it. Both still import from `./storage` as before: what changes is where it comes from.

**Why this way**: it is the seam [ADR 0073](../adr/0071-0080/0073-una-sola-interfaz.md) and [ADR 0074](../adr/0071-0080/0074-una-sola-sesion.md) already decided: transport and where the state lives belong to each platform, the logic does not. There is no new ADR because the model, the `Plataforma` contract and what you see do not change: it is debt paid inside a decision already taken. Moving the project itself to one place was discarded —the web has no `.codarch/` to leave it in (ADR 0048)— as was a shared `localStorage` for the repo's state, which stays with the repo.

**How it is checked**: the two apps' tests **have not been touched** and are still green, which is the evidence that the behaviour is the same: `apps/web/test/storage.test.ts` covers preferences and project, and `apps/desktop/test/storage.test.ts` covers the root and the old project. The shared module gets its own: preferences, plugins, no storage at all, the project guard, the `addons` and forgetting by key. The three modules go from 350 to 330 lines; what disappears is the copy, not the lines.

**Verdict**: a fix inside ADR 0073 and ADR 0074. The rest of the same list is still open: the `chains → heat` and `history → entries` projections, which the two `Plataforma` adapters still write on their own.
