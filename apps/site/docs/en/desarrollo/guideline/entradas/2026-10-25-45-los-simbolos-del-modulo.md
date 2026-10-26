---
title: Every symbol in the module
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: the lens knew six kinds of symbol but only emitted five. Constants were dismissed as "data, not structure", so `packages/ui/src/labels.ts` looked like a file with one function and hid `EVENT_LABEL`, `SYMBOL_LABEL` and `CHURN_METRIC`, the interface's vocabulary table. The diff also compared kind, complexity and lines: a constant changing from `10` to `20` went unseen.

**What changed**: module variables are symbols. `const`, `let` and `var` with a value are emitted as `variable`, including string constants and configuration objects. An arrow or a class stored in a constant is still `function` or `class`, in any scope. Local variables, destructuring and valueless `let` stay out: they are implementation, not the file's structure. The summary gains `variables`, the MCP exposes all six kinds, and the diff compares the body hash. In the card, symbols are grouped by kind —functions, classes, interfaces, types, enums and variables— and the folded summary states the split (`12 fn · 8 var · max 15`); the symbol's life becomes one more collapsible section.

**Numbers**: across the 293 files in the analysis, **440 variables** that were invisible before, out of **1,886 symbols**. `packages/ui/src/labels.ts` goes from 2 symbols to 9: seven constants and two shaped declarations. The order of `symbolsOf` does not change; the checksum changes because the lens is more complete, not because the identity rule changed. Giving variables a body exposed an old bug: methods had an empty hash because the node and its name start at the same column and the whole node was skipped. Now only the name leaf is skipped, so every method, class and variable has a distinct body.

**Verdict**: [ADR 0063](../../adr/0061-0070/0063-todos-los-simbolos.md), done. Its roadmap keeps a name filter for huge lists, distinguishing a variable's value, and — if the model needs them — namespaces and import aliases.
