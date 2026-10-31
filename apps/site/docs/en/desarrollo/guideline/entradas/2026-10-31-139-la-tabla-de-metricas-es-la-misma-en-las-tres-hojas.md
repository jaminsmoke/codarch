---
title: "The metrics table is the same in all three sheets"
date: "2026-10-31"
category: "fix"
verdict: "arreglo"
---

**What it was**: the Métricas table read well only in the file sheet. The folder's added up the same

values but came out without ink —the warning and the debt in grey, like any number— and without the

section frame: its rows blurred into the ones next to them. The project's had no ink either, and its

container was already there, so the difference showed more.

**What changes**: the three tables share the same component and the same colour rule. The debt red and

the warning ochre cross the project's threshold for any subject, folder and project included: the

subtree's figure is the sum, and the file that puts it —the worst one— decides the ink and is named in

the row's tooltip. The folder's table sits inside the section frame the file sheet already had, and its

Reglas section, which painted its own container inside, stops doing so: one section, one frame.

**Why this way**: a table that dresses differently per subject makes you read the same column twice. If

the number is the same and the threshold is the same, the ink is too; the only thing that changes is

whose maximum it is, and the tooltip was already there for that.

**Verified**: `metrics.test.ts` covers the folder and project row ink with the subtree's worst file, and

`sectionFrame.test.ts` that the folder sheet does not nest two frames. Lint, typecheck, the full suite

and `site:build` are green.

**Verdict**: fix.
