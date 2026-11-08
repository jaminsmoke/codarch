---
title: "ADR 0110 — Clean lint says it is clean"
description: "Each tool declares its universe —ESLint through its results and oxlint through --debug=files—; a missing config file is stated, but it does not stop calling clean what was measured whole."
section: desarrollo
status: accepted
date: "2026-11-08"
sidebar:
  label: Clean lint says it is clean
  order: 110
---

**Status:** accepted · **Date:** 2026-11-08

It **amends** point 5 of [ADR 0107](0107-la-cobertura-del-lint.md) and decision 3 of
[ADR 0109](0109-la-salud-del-lint-se-lee-junta.md), which left ESLint's universe at `null` and, with
it, code always `partial`. It also amends the point of
[ADR 0104](0104-el-lint-se-lee-por-hallazgos.md) that did not show the systems in the card: the card now
shows the **note that qualifies the measurement**, not the rule catalog.

## Context

In this repo the project card said “Partial coverage: no findings observed in what was measured. It is
not known which files were eligible” with ESLint and oxlint at zero over 685 and 731 files. The zero was
true; “partial” came from two things: `eligiblePaths` was never written —it stayed `null`— and oxlint did
not enumerate. The reason also did not say what was really happening: oxlint was installed as a
dependency and had no config file.

## Decision

1. `coverage.tools[].eligiblePaths` is written. It is still contract **1.3**: the field already existed
   and a reason's `text` was already free-form; there is no 1.4.

2. Each tool declares its universe, not the snapshot:

   - **ESLint**: its JSON returns clean files too. In a run over the root, what it returns is the
     universe.
   - **oxlint**: `--debug=files` prints the exact list of files it is going to lint. That list is
     `eligiblePaths` and `measuredPaths` for the run.
   - **Checkstyle, Biome, Ruff, go vet and dotnet**: if they do not list clean files, they stay
     `unknown` with a reason that says **why**. Ruff may use `--show-files` once wired; it is out of
     scope here.
   - A `lint:` block in `.codarch.yml` may declare `list`, a command that prints one path per line.
     Without `list`, no universe is assumed.

3. `scopeHealth` does not change shape: `complete` requires every tool to cover **its own** universe in
   the scope. `isCurrentClean` still requires `complete`, `fresh === true`, zero findings and
   `eligible > 0`.

4. An installed tool **without a config file** says so in `meta.systems[].note`: “no config file: it runs
   its default rules and they are not enumerated”. It does not block `complete`: config changes which
   rules run, not which files were measured. The project card shows one row per tool —state, config,
   rules and measured files— with its note; the catalog stays under **Rules**.

5. The project, folder and file cards say **“Clean and up to date”** when `isCurrentClean`. Otherwise
   they show errors, warnings and info and the reasons. With zero findings the row of zeros is not
   painted: it says clean.

6. The checksum changes only because `coverage` content changes; the contract stays at 1.3 and old
   artifacts are read the same way.

## Consequences

- A project measured whole and without findings no longer looks doubtful, and neither does a folder or
  a file.
- “Measured N” counts the union of what each tool measured, clean files included.
- A tool without config is no longer confused with unknown coverage: its note is visible.
- Risk does not rescale anything: it reads the same counts.

## Rejected alternatives

- **Deriving the universe from the snapshot.** Not every tool lints the same extensions: oxlint covers
  `.astro` and ESLint does not.
- **Calling any run complete without a list.** It would invent the universe ADR 0107 refused to invent.
- **Blocking “clean” because of a missing config.** Config does not change the files; it changes the
  rules, and that is stated separately.
- **Bumping to 1.4 for a new reason.** The reason text already fits in 1.3; a new version would break
  readers for a note.

## Roadmap

No new phase.

- ✅ The decision.
- ✅ The universe per tool: ESLint from its results, oxlint with `--debug=files`, and `list` in
  `.codarch.yml`.
- ✅ The missing-config note and “Clean and up to date” in the project, folder and file cards.
- ✅ One row per tool in the project card: state, config, rules and measured files.
- ✅ Tests: clean in all three scopes, oxlint enumerated, missing config and stable checksum.
- ✅ The 1.3 artifact page and the CLI guide.

The record of what is done lives in the [guide feed](/en/desarrollo/guia/).
