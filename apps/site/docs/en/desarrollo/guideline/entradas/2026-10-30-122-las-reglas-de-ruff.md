---
title: "Ruff's rules, expanded"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**What it was**: Ruff's block listed its selectors —`E`, `F`, `E501`— with a note saying each one could group several rules. It was what the config said, not what the project demands: nobody knows by heart whether `E` is forty rules or sixty.

**What changes**: Ruff asks its own version for the catalogue, `ruff rule --all --output-format=json`, and expands each selector into the rules it matches. Specificity is Ruff's: the most specific selector wins and, on a tie, the ignored one; `ALL` stands for every rule. So `select = ["E", "F"]` with `ignore = ["E501"]` keeps E101 and F401 and drops E501, while `select = ["E501"]` with `ignore = ["E"]` keeps E501. Rules enter sorted and deduplicated, and the note says they come from the catalogue. If the catalogue cannot be read —Ruff is missing or its version does not emit JSON— the selectors are listed and the note says why.

**Why this way**: the catalogue comes from the tool, not from us. A rule table per version in the repo would age and lie as soon as Ruff was updated, which is exactly what ADR 0096 avoids: measure with what the project has.

**Verified**: tests for prefix expansion, specificity in both directions and `ALL`, for a catalogue with no duplicates or junk, and for both notes: with and without a catalogue. Plus a real `codarch lint` run on the test repo with its stub binary: `select = ["E", "F"]`, `extend-select = ["B"]` and `ignore = ["E501"]` come out as B006, E101 and F401. Full suite (1,260), lint, typecheck and site build green.

**What is missing**: Checkstyle's rules, and the readers for Checkstyle, `go vet` and the .NET analysers.

**Verdict**: phase in progress.
