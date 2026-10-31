---
title: "Lint belongs to the project"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**What it was**: `codarch lint` only knew how to launch the commands written by hand in the `lint:` block of `.codarch.yml`. In practice that pushed towards inventing lint: an `npx` that brings its own version, a config the repo does not use, or a map counting lint the project does not have. And the ficha only showed numbers.

**What changes**: the command **detects** the lint the repo already has —eslint, oxlint, biome, ruff, checkstyle, `go vet` and `dotnet`— from its config file and from the installed tool, and runs it **with the repo's binary and config**, at its root, inheriting config upwards to the analysed root. The `lint:` block stops being the plan: it becomes an override, and `--no-detect` runs only that. The artifact goes up to **1.1** with `meta.systems` —tool, dialect, config used, where it came from, active rules and how many— and 1.0 is still read. ESLint lists its rules with `--print-config`; oxlint counts the ones it ran; those that cannot say so say it instead of inventing a list.The **Rules** section shows those systems, their config and their active rules in the project ficha;
the folder and the file read the rules with findings in their scope. The counts stay in Metrics.
Without lint and without an artifact, the project and folder fichas recommend the minimum for the stack
they see (eslint on TS/JS, ruff on Python, staticcheck on Go, Checkstyle on Java, `dotnet format` on
C#) without writing anything. This repo did not need the block: it was removed and its own map is now measured with the eslint and oxlint it already had.

**Why this way**: the map counts what the project measures, not what we would like it to measure. No `npx`: a tool the repo did not install is not its lint. And with no config and no tool there is no artifact —not even an empty one—: not measuring and being clean are different things, and the checksum depends on the code, not on what you have installed.

**Verified**: new tests for each detected system, the config inherited from the root, the override that wins, eslint rules coming from coarse globs, oxlint rules counted, artifact 1.1 and 1.0 still accepted,findings in the three scopes with their counts, the systems in the project ficha, clean versus
unmeasured, and the recommendation when there is no config. Full suite (1,238), lint and typecheck green.

**What is missing**: running the tools from the web app —without Node there is no process, so it shows what the CLI or `serve` measured—, the rule lists for biome and ruff, and lint in the MCP.

**Verdict**: phase in progress.
