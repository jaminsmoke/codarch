---
title: "The rest reads by kind"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: with [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) the rest already had its button and its loading, but its colour was still its size: the rail had no lens saying what each file is, and the legend had no version by kind.

**What changes**: the map model carries the `kind` of the `rest` lens on every file, the rest's colour becomes its kind —documents, configuration, assets or other— with four muted tones, and the legend counts how many there are of each, staying silent about the ones that do not exist. Size remains as one more colour in the selector. Switching to the rest map starts on kind; switching back to code restores the area and colour it had, and a live refresh while the rest is in front no longer overwrites them.

**Why like this**: the kind was already computed while walking, so it was what the map knew and did not show. It is painted from `RenderFile.kind` rather than going back to the snapshot because plugins ([ADR 0028](../../adr/0021-0030/0028-los-plugins.md)) consume that colour too, and they should not need the rest loaded. Four tones instead of one per extension: the colour names the family, and a legend with forty colours cannot be read.

**What is missing**: the strata grouped by `kind` and the rest file's own ficha; the rules of the rest, in their own ADR.

**Verdict**: phase under way.
