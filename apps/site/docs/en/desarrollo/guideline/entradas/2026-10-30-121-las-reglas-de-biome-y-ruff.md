---
title: "Biome's and Ruff's rules"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**What it was**: Biome and Ruff already measured their findings, but the systems block still said their rules were not enumerated: the messages were visible, not what the project demands.

**What changes**: **Biome** reads the rules its config writes —`style.useConst: "error"` gives `style/useConst`— with their group and level; `off` does not enter and the `recommended` ones are not listed, because they depend on the Biome version, and the system's note says so. **Ruff** reads its selectors from `[lint]` in `ruff.toml` and `[tool.ruff.lint]` in `pyproject.toml`: `select` and `extend-select`, minus those switched off by `ignore` and `extend-ignore`, and warns that they are selectors —`E` groups dozens of rules and `E501` is one—. Without `select`, Ruff's defaults run and are not enumerated. Reading the TOML uses a minimal reader for the table and its lists, with comments and several lines; no expanding prefixes with a catalogue of our own.

**Why this way**: enumerating what the config does not write would be inventing it. Biome's recommended rules and Ruff's selectors cannot become a list of rules without the catalogue of the version the project has, so they are declared as they are and the gap is explained, just like with systems that have no reader.

**Verified**: tests for Biome's rules with their groups, `off` and object levels; for Ruff's selectors in `ruff.toml` and in `pyproject.toml`, with `ignore` and comments; and for both notes when there is nothing to enumerate. Plus a real `codarch lint` run on the two test repos with their stub binary: the artifact comes out with `2 rules` for Biome and `3` for Ruff, with their notes. Full suite (1,257), lint, typecheck and site build green.

**What is missing**: expanding Ruff's selectors into rules with its version catalogue, Checkstyle's rules, and the readers for Checkstyle, `go vet` and the .NET analysers.

**Verdict**: phase in progress.
