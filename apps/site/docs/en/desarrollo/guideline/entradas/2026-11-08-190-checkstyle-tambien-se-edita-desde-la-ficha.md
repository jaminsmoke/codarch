---
title: "Checkstyle is also edited from the card"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: Checkstyle was still read-only.

**What changes**: the Checkstyle writer ([ADR 0112](/en/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) removes a `<module name="…">` from its XML, whether self-closing or with properties and children. Enabling is only allowed with a **curated catalog** of frequent modules that already know whether they hang from `Checker` or `TreeWalker`: the module is inserted into that container. An unknown module is rejected; the container is not guessed. The whole XML is not rewritten: only that element is touched.

**Why this way**: removing is safe; adding without a container is not. The same rule as elsewhere: if it cannot be done well, say so and do not pretend.

**Verified**: removing `NeedBraces` with properties removes the module and its `property`; removing self-closing `LineLength` keeps `FileLength`; enabling `LineLength` puts it in `Checker` and `NeedBraces` in `TreeWalker`; an unknown module is rejected with the container reason; a missing module is reported.

**What is missing**: expanding the curated catalog to more Checkstyle modules; the rest of the linters are done.

**Size**: the writer in `@codarch/lint`; the editable condition and note in the card.

**Verdict**: done.
