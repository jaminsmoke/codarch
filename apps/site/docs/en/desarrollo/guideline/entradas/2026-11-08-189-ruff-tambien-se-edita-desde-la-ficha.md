---
title: "Ruff is also edited from the card"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**What it was**: Biome could already be enabled and disabled, but Ruff stayed read-only.

**What changes**: the Ruff writer ([ADR 0112](/en/desarrollo/adr/0111-0120/0112-el-gestor-de-reglas/)) touches the real TOML of `ruff.toml`, `.ruff.toml` or `[tool.ruff.lint]` in `pyproject.toml`. Enabling adds the code to `extend-select` and removes it from `ignore`/`extend-ignore`; disabling adds it to `extend-ignore` and removes it from `select`/`extend-select`. The whole TOML is not rewritten: only the specific array is edited. An array with comments is rejected so they are not lost. The add menu uses `ruff rule --all --output-format=json` when the binary is in the project; if not, it says so and does not invent.

**Why this way**: the project config wins and the format is TOML; touching only the array avoids losing tables, comments and order. Ruff selectors group rules, so it works with concrete codes and `ignore`.

**Verified**: in `ruff.toml`, enabling `F401` creates `extend-select` and keeps `[format]`; in `pyproject.toml`, disabling `E501` removes it from `select`, leaves `ignore` empty and creates `extend-ignore`; an array with comments is rejected.

**What is missing**: Checkstyle (XML).

**Size**: the Ruff writer and catalog in `@codarch/lint`; the editable condition in the card.

**Verdict**: done.
