---
title: Every symbol, and foldable
date: "2026-10-25"
category: feature
verdict: adr
---

**What it was**: the file card showed twelve symbols and summed up the rest with "and N more". In `apps/mcp/src/tools.ts` there were fifty: thirty-eight had no way of showing up, just when a symbol is the door to its commit chain. The section also did not look like **Metrics**: a mono uppercase eyebrow, no count and no folding.

**What changed**: **Symbols** uses the same collapsible section as **Metrics**. The title is bold, with the count beside it (`50`), and when closed it summarises what is hidden: `max complexity 15`. Every symbol is shown, with no cut and no ellipsis, in the model's order —most complex first and, at equal complexity, by line. Each row keeps its kind, name and complexity, the tooltip adds the line, and the folded state is remembered in the browser. A short note explains the order and that pressing a symbol opens its life.

**Numbers**: from 12 visible rows and 38 hidden to 50 available. With the section closed, the card fits the inspector again (597 px) and leaves the summary in sight. `cc.json`, the checksum, the report and the order of `symbolsOf` do not change.

**Verdict**: [ADR 0062](../../adr/0061-0070/0062-los-simbolos-tambien-se-pliegan.md), done. Its roadmap keeps a name filter for huge lists, grouping by kind, and bringing the pattern to the symbol life and the report cards.
