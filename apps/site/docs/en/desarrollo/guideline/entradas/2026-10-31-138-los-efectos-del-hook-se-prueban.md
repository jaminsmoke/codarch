---
title: "The hook's effects are tested"
date: "2026-10-31"
category: "chore"
verdict: "arreglo"
---

**What it was**: the suite tested components with `renderToStaticMarkup`, which runs no effects, so half
of the app hook —loading documents, restoring the saved project, listening to shortcuts— had not a single
test. Nobody mounted the whole hook because `plugins.ts` imports `virtual:codarch-plugins`, a module the
build generates and which does not resolve outside it.

**What changes**: `@testing-library/react`, `@testing-library/dom` and `jsdom` come in as root dev
dependencies, and `vitest.config.ts` resolves `virtual:codarch-plugins` to an empty test registry
(`packages/ui/test/fixtures/plugins-empty.ts`): the app loads with zero plugins, like a repo that declares
none. `appHookEffects.test.ts` mounts the hook in a real DOM and covers fourteen cases: document loading
—a valid snapshot decides its view and stops loading, a broken one is reported and leaves no half map,
opening a project saves it—, the live refresh —it warns on another tree, does not warn on the same one and
does not move the view, and respects the preferred area when opening another project—, shortcuts —`/` to
search, `Ctrl+,` to settings, `Escape` to drop search, focus and selection—, the saved project at boot —it
restores with its label, and one that no longer opens is deleted—, lint adding its lens, the rest map
opening by bytes and going back to code, and a requested view applied with what the map has.

**Why this way**: an effect cannot be checked by reading HTML that never ran. With a real DOM you check
what actually matters —that `/` leaves focus in the search box, that a refresh does not move the map—
without changing the environment of the whole suite: only the file that needs it asks for `jsdom`.

**Verified**: **161 files and 1385 tests** green, with the fourteen new cases; `npm run lint` silent over
558 files; typecheck and `site:build` correct. The hook's smoke test still mounts it without a DOM for
what is only read.

**Verdict**: fix.
