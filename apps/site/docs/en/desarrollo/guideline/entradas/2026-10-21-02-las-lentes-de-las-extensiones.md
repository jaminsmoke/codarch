---
title: Extension lenses
date: "2026-10-21"
category: feature
verdict: esperar
---

**What it is**: an extension being able to **measure something new** and put it into the snapshot
(for example, NestJS dependencies or a framework's modules).

**Why**: that is what would make extensions **truly useful**: not just views, but new signals.

**The problem**: the **checksum**. If a lens depends on the extension, the snapshot depends on
what is installed → the same code would give different checksums → the analysis would stop being
reproducible (the property the product protects most carefully).

**The decision**: [ADR 0029](../../adr/0021-0030/0029-los-addons.md): today, **no**. An addon adds
no lenses ("A"), and the door stays open to "B" —the producer **inside** the snapshot → "the same
code + the same addons = the same checksum"— once the way is decided, with its own ADR.

Meanwhile, an addon that needs a new signal **computes it in its view** (as the 3D view does) and
does not share it: it cannot paint it, see it in the PR, or ask the agent about it.

**Verdict**: **wait** for variant "B": the way has to be decided before offering it.

**Size**: large. And the first to need it may be the 3D view, which today does not touch the model.
