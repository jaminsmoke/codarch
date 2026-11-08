---
title: "The bars 3D view is removed"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: there were two 3D plugins. Atlas and the old bars view shared WebGL2 and the model,
but not the metaphor; keeping both confused the choice and duplicated camera and volumes.

**What changes**: `plugins/vista-3d` and its entry in `.codarch.yml` are removed.
[ADR 0114](/en/desarrollo/adr/0111-0120/0114-el-atlas-sustituye-a-la-vista-3d/) leaves Atlas as the
only 3D view in the product.

- If someone had `vista-3d` enabled, the plugin no longer exists and the classic map comes back.
- There is no alias, no “classic 3D” mode and no hidden copy.
- Its tests and roadmap are deleted.
- README, usage guide and the settings screenshot are updated.
- The 2D map remains the fallback.

**Why this way**: one 3D metaphor, one maintenance and less code. History stays in the old ADRs, which
still explain why there are plugins and why 3D uses custom WebGL2.

**Verified**: the web build no longer emits the `vista-3d` chunk; Settings shows only Atlas; the
classic map is still available; the suite, typecheck and site build pass.

**Size**: removing the plugin and cleaning registry, tests and documentation.

**Verdict**: done.
