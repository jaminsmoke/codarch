---
title: The file card shows the code
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: the card listed symbols, members and surface, but reading a body meant opening the editor. Symbol groups could not be folded and a metric's explanation lived in a `title` that only appeared when hovering the name.

**What changed**: every symbol stores its line span, not just functions. Clicking one asks the platform for the real code —local server, desktop or the files the web keeps in memory— and shows it in a collapsible section with line numbers and two lines of context. The shared reader never leaves the repo, rejects symlinks and directories such as `.git` or `node_modules`, and caps at 400 lines or 1 MB. Functions, Classes, Interfaces, Types, Enums and Variables fold independently, and each Metrics row carries a `?` before the name with the short explanation; the row tooltip still shows scale, p95 and coverage.

**Numbers**: `labelFor` shows its 13 lines plus 2 of context; the 20 metric rows have visible help. Code never enters `cc.json` or the report; the checksum changes because every symbol now carries its line span, not because source is stored.

**About variables**: module-level `const` and `let` are captured. Those holding an arrow or a class appear under **Functions** or **Classes**, not **Variables**, because that is what they are. Locals, destructuring and valueless `let` are not captured. Namespaces, object keys and top-level loose code remain out for now.

**Verdict**: [ADR 0067](../../adr/0061-0070/0067-la-ficha-ensena-el-codigo.md), done. Syntax highlighting, jumping to the editor line and class-member code remain.
