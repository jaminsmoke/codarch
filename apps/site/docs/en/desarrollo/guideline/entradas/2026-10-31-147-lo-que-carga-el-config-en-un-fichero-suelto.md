---
title: "What a config loads, in a single file"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**What it was**: `npm run web:build` failed before starting, and the desktop build with it:

```
Cannot find module '…/packages/schema/src/chains'
imported from '…/packages/schema/src/index.ts'
```

`vite.config.ts` imports `@codarch/plugin-api/build`, which imported `findRepoConfig` from `@codarch/schema`.
Vite loads its configuration leaving packages as external, so that import is resolved by the system's Node:
Node 24 strips TypeScript types on the fly but resolves relative imports requiring the extension. `index.ts`
says `from "./chains"` and that is the end of it.

**What changes**: the package exposes what a build needs to know about `.codarch/` without dragging the
whole package along: `@codarch/schema/artifacts` → `artifacts.ts`, a single file with no relative imports.
`plugin-api/build.ts` reads `CONFIG_FILE_NAMES` from there and looks for the config file in six lines;
`@codarch/schema` keeps its own, with the same list.

**Why this way**: whatever a configuration loads runs before any Vite resolution, so the rule is that its
graph is made of single files or JavaScript. Copying the two names into `plugin-api` would have been
shorter and is exactly what the names registry exists to avoid (ADR 0101): the list stays in one place and
the module that needs it imports it.

**Verified**: `web:build` writes the bundle (Vite says “built in 1.70s”) and so does the desktop one (`184ms`);
typecheck and lint silent; the whole suite green. The plugin graph is unchanged: manifests still come from
`.codarch.yml` as before.

**Verdict**: fix.
