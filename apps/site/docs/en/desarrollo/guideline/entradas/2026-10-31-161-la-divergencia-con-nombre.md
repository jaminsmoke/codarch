---
title: "Divergence, with a name"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**What it was**: duplication was already measured and painted (M68 and M69), and the file card showed
its pairs, but the project and the folder only gave the figure. Knowing that 3 % of the `rloc` is
copied does not say **between whom** or **which ones are drifting apart**, which is what can be fixed.

**What changes**: the model gains `duplication.list`, the list of pairs with both ends and the map's
paths, sorted once by similarity, lines and paths. The project and folder sheets show that list with
its state —`copy` or the percentage—, its lines and a **All / Copies / Diverging** filter with each
state's count. Each end is a button that opens its card. The file card also says it with a name:
"shares 72 % with `…`: the two copies are drifting apart", instead of leaving the percentage only in
the row.

**Why this way**: a pair counts in a subtree when **both** files are inside; the one that crosses the
border belongs to the parent folder, because counting it on both sides would add the same lines twice.
The list does not reorder: it inherits the snapshot's deterministic order and the filter only decides
what is shown, so two analyses of the same tree give the same rows. `pairsByNode` stays because a
file's card speaks from one side, and `list` because the project's card speaks from both.

**Verified**: the whole suite is green at **177 files and 1539 tests**. New tests cover the model (the
list with the map's paths, ordering with a similarity tie and a pair with one end outside), the list
(the state filter, the counts and the border rule), the project sheet (both ends, the filter counts)
and the divergence notice with a name. Typecheck and lint clean.

**Verdict**: done. M70 closes; M71, duplication in the diff, remains.
