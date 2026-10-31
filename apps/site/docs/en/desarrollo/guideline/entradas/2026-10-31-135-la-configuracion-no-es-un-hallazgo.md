---
title: "Configuration is not a finding"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**What it was**: **Reglas** said «372 como error · 24 como aviso» in the red and ochre of debt, and its severity bar read as a total of findings. **Métricas** said zero. Both figures came from the same artifact and both were true: one counted **configured rules**, the other **messages**. But they shared colour and words, so the app looked like it contradicted itself, and with a clean repo the lint lens had nothing to paint: it read as if lint were broken.

**What changes**: the severity of an active rule is labelled and painted as **configuration** —«Configuración · 372 como error · 24 como aviso», in grey, with a neutral dot in the list—, with no debt ink; that ink is left only to the table of rules with findings. A system carries its configuration sentence instead of the red bar. And the zero comes with its coverage: **«Medido y limpio: 496 ficheros mirados, ninguno con hallazgos»** in Métricas and **«Sin hallazgos en el proyecto: se midieron 496 ficheros»** in Reglas. The counts do not change: they still come from messages, in one place.

**Why this way**: two true things can look like a lie when they are dressed the same. A configured severity is not debt until it produces a message, and a zero without «out of how many» cannot be told from a measurement that never happened (ADR 0098). The reader should not need to know which artifact field each sheet reads.

**Verified**: with a probe file in this repo, `analyze` measures 3 warnings over 496 files and the artifact signs them with the tree; with the repo clean, both sheets say the same count and its coverage, and the lens paints the map in the clean green. Tests that configuration uses no debt ink, that a measured system no longer draws a red bar, and that a clean project shows its coverage. Typecheck, lint and suites green.

**Verdict**: fix.
