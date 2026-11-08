---
title: "Checkstyle is disabled from the card"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: Checkstyle was still read-only.

**What changes**: the Checkstyle writer ([ADR 0112](/en/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) removes a `<module name="…">` from its XML, whether self-closing or with properties and children. The whole XML is not rewritten: that element is removed and the rest is kept. Enabling a module is **not** done yet: its parent could be `TreeWalker`, `Checker` or another container, and the config does not say; inventing it would break the measurement. The card says so and does not show the add menu for Checkstyle.

**Why this way**: removing is safe; adding without a container is not. The same rule as elsewhere: if it cannot be done well, say so and do not pretend.

**Verified**: removing `NeedBraces` with properties removes the module and its `property`; removing self-closing `LineLength` keeps `FileLength`; enabling is rejected with the container reason; a missing module is reported.

**What is missing**: enabling Checkstyle modules once their container is known; the rest of the linters are done.

**Size**: the writer in `@codarch/lint`; the editable condition and note in the card.

**Verdict**: done.
