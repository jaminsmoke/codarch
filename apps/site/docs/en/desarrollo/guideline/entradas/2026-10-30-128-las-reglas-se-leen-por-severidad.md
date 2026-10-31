---
title: "Rules read by severity"
date: "2026-10-30"
category: "feature"
verdict: "arreglo"
---

**What it was**: the project's **Reglas** section counted the right thing and read it badly. The systems, their configuration, their state and their active rules were set in 9 px mono in nearly the same ink: `eslint`, `eslint.config.js`, `medido` and `24 reglas activas` read as four equal lines. The findings table had no header, a zero left an empty cell and errors and warnings shared the same grey, so twelve rules were twelve indistinguishable rows. An `info` was written `1 info`, which does not say how many there are.

**What changes**: each system is a card with its rule —green when it measured—, the name in 11.5 px 600 sans, its config in mono, the **medido** or **sin medir** pill and a severity bar whose width is each count. Expanding its active rules gives every rule the dot of its severity and its word in the ink that belongs to it. Findings go in a table: a **Regla · Err. · Avis. · Info** header sharing the row grid, zeros as a dash and each number in the red of debt, the ochre of a warning and the blue of `info` —the same colours a lint violation uses in **Cambios**—. The rule identifier moves to full ink; the count is what you look at.

**Why this way**: in a 286 px sheet the fix is not raising every size. It is hierarchy —weight and family— and colour with meaning: severity already had colours in the app and they were not used here. Reusing them makes an error look like an error in both tabs, with no new legend.

**Verified**: presentation tests —column header, zero dashes, measured-system pill, severity bar and dots— plus the existing counter and scope tests; typecheck and suite green.

**Verdict**: fix.
