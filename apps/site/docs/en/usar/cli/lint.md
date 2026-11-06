---
title: "codarch lint"
description: "Reads the lint the project already has —its configuration and its tool— and writes the .codarch/lint.repmod.json artifact."
section: usar
sidebar:
  label: "lint"
  order: 29
---

`codarch lint` ships no linter and writes no configuration: it **reads the lint the project already has** and writes an artifact with what it said. If the repo has no lint, it does not make one up: it recommends the minimum and writes no artifact. Lint does not enter the snapshot —it depends on the installed tools and their configuration—, so it has its own file, its own checksum and its own lifecycle. In normal use whoever measures it is [`codarch analyze`](analyze.md), in the same pass as the other lenses; this command is for measuring it standalone, with no map.

## What it detects

| System | Configuration it looks for | What is read |
| --- | --- | --- |
| **ESLint** | `eslint.config.*`, `.eslintrc*`, `eslintConfig` in `package.json` | `eslint --format json` and its active rules via `--print-config`. |
| **oxlint** | `oxlint.json`, `.oxlintrc.json`, `.oxlintrc` | `oxlint --format json` and the rules in its JSON. |
| **Biome** | `biome.json`, `biome.jsonc` | `biome lint --reporter=json`; its active rules are not enumerated yet. |
| **Ruff** | `ruff.toml`, `.ruff.toml`, `[tool.ruff]` in `pyproject.toml` | `ruff check --output-format=json`, with the `ruff` on the PATH. |
| **Checkstyle** | `checkstyle.xml`, `config/checkstyle/checkstyle.xml`, the plugin in `build.gradle` | `checkstyle -c <config> -f xml .`, with the `checkstyle` on the PATH. The Gradle plugin does not say which XML it uses: nothing is measured there. |
| **go vet** | `go.mod` | `go vet ./...`, with the `go vet` on the PATH. |
| **.NET** | `*.csproj`, `*.sln` | `dotnet format <solution|project> analyzers --verify-no-changes --severity info`, with the SDK on the PATH; the solution wins over a single project. |

A system enters if it has its own configuration **or** if its tool is installed. If there is configuration and no binary, the command says so: **it is not completed with `npx`**, because downloading a version the repo did not choose would be making the measurement up. Tools run with the project's binary (`node_modules/…`) —Ruff and Checkstyle, which do not live there, with the ones the project has on the PATH— and its own configuration.

Biome gives no line or column in its JSON —its `span` is byte offsets—, so its messages enter without a position instead of computing one by hand. Ruff gives no severity: all its findings count as errors, which is how it treats them when it exits non-zero.

ESLint and oxlint yield the same normalised message: rule, severity, line, column and text. Absolute paths become relative to the root and paths outside the repo are dropped. If two tools say exactly the same thing about the same place, it counts once.

## Active rules

- **ESLint** is resolved with `eslint --print-config <file>`, which reads the real configuration —flat config, plugins and overrides— instead of interpreting the file by hand.
- **oxlint** is read from its JSON; without configuration it runs its default correctness rules and the artifact says they are not enumerated.
- **Biome** reads the rules its config writes, with their group and level (`style/useConst`). The `recommended` ones depend on the Biome version and are not enumerated: the system's note says so.
- **Ruff** enumerates its rules, not its selectors: it reads `select` and `extend-select` (minus `ignore` and `extend-ignore`), asks its own version for the catalogue with `ruff rule --all --output-format=json` and expands by prefix with Ruff's specificity: the most specific selector wins and, on a tie, the ignored one. Without `select`, the defaults run and are not enumerated; without a catalogue, the selectors are listed and it says so. The catalogue is stored in `.codarch/lint-cache.json` with the Ruff version that produced it: it is only requested again when you upgrade Ruff. It is not part of the artifact or the checksum, and `.codarch/` is not created just to write it.
- **Checkstyle** reads the `<module name="…">` entries of its XML, without containers (`Checker`, `TreeWalker`) or suppression filters. Its config gives no severity per module: each finding brings it.
- **go vet** and the **.NET analysers** do not enumerate their rules: they go with the Go version or with the SDK and `AnalysisLevel`. `go vet` findings enter as `go vet` —its text does not sign the analyser—; .NET ones carry their code (`CA1822`, `CS0168`). A plausible list would be worse than a gap.

## The optional override

The `lint:` block in `.codarch.yml` is for commands detection does not cover. If present, **it wins** and runs as declared:

```yaml
lint:
  - name: eslint
    command: node node_modules/eslint/bin/eslint.js . --format json
    format: eslint-json
```

Each entry carries `name`, `command` and `format` (`eslint-json`, `oxlint-json`, `biome-json`, `ruff-json`, `checkstyle-xml`, `govet-text` or `dotnet-text`). A malformed block is an error instead of a guess.

## Usage

```sh
codarch lint [path] [options]
```

## Options

| Option | What it does |
| --- | --- |
| `-o, --out <dir>` | Artifact directory. Defaults to `<path>/.codarch`. |
| `--config <file>` | YAML with the override. Defaults to `.codarch.yml` when it exists. |
| `--no-config` | Ignores the YAML override; uses the project's lint. |
| `--no-detect` | Does not detect the project's lint. |
| `--fail-on <mode>` | `never`, `errors` or `warnings`. Defaults to `never`. |
| `-h, --help` | Help. |
| `-v, --version` | Version. |

## Output

It writes `lint.repmod.json` in the output directory. If it creates `.codarch/` at the root, it adds `.codarch/` to `.gitignore`; if the directory already existed, it is left alone. A `.codarch/lint.json` or `lint.cc.json` from an earlier version is not read: the sheet says “unmeasured” until it is analysed again.

```json
{
  "schemaVersion": "1.3",
  "domain": "code",
  "meta": {
    "checksum": "…",
    "tools": ["eslint"],
    "systems": [
      {
        "name": "eslint",
        "config": "eslint.config.js",
        "rules": [{ "id": "no-console", "severity": "warn" }]
      }
    ]
  },
  "files": {
    "src/a.ts": {
      "errors": 0,
      "warnings": 1,
      "messages": [
        { "rule": "no-console", "severity": "warn", "line": 1, "column": 1, "message": "Unexpected console" }
      ]
    }
  },
  "coverage": {
    "tools": {
      "eslint": {
        "outcome": "enumerated",
        "measuredPaths": ["src/a.ts"],
        "eligiblePaths": null
      }
    }
  },
  "summary": { "files": 1, "errors": 0, "warnings": 1, "messages": 1, "measured": 1 }
}
```

`meta.systems` says which lint the project **has** —with its configuration and active rules— and `meta.tools` which ones actually measured. A `1.0`–`1.2` artifact is still read: coverage becomes `unknown` with `legacy-global`, and `measured` is not invented.

`summary.measured` is how many files **coverage derived**, clean ones included, which do not appear in `files`. It is a **global** figure for the pass. It is written only when it can be derived: a zero that does not come from a valid enumeration is not stored. ESLint and Checkstyle know who they looked at and not the universe (`eligiblePaths: null`), so code is never `complete`. `meta.tree` is the checksum of the snapshot that was measured; whoever analyses fills it —`codarch analyze` and, in live, `serve`—. This standalone command does not analyse the repo, so on its own it writes no `tree`: the app cannot compare and does not pretend to.

`summary.files`, `summary.errors`, `summary.warnings`, `summary.messages` and each file's `errors` and `warnings` are **regenerated on read** from the messages. `summary.files` is the number of files with at least one finding. An `info` counts as a message and as a file, and not as an error or a warning. Paths are canonicalized on read —NFC per segment, with `/`, without `./` or repeated slashes— and are not lowercased. If two distinct keys fall on the same path, they are not merged silently: the read records it in `diagnostics`. The schema is **1.3**. The names stay `lint.repmod.json` and `lint-rest.repmod.json`.

Files by relative path, messages sorted by line and column, and a checksum that does not change when the tools' output does not change. **Zero findings is not “clean”**: that needs `complete` coverage, a fresh tree, and something eligible to measure. No artifact means nobody measured.

The summary shows the root, the source, the artifact, what each tool did and each system with its configuration. The **files with findings** are those with at least one message, and they are shown **out of those measured** —`3 files with findings out of 494 measured`—: that is what tells a clean repo from an unmeasured one. The rule and finding count is the same one the app and the MCP read, and `--fail-on` decides with that same count, not with the summary the file declares.

![Output of `codarch lint .` in the terminal](../../../images/cli-lint.png)

## Soft failure

Tools run in parallel and the command waits for all of them. One that is missing or crashes is reported and the rest go on: the artifact is written with what did measure, and only with those tools.

A linter with findings exits non-zero, and that is **not** a failure if it left its JSON. That is why the command does not block by default: `--fail-on errors` is what CI uses, and `--fail-on warnings` counts errors and warnings.

## If the project has no lint

It writes no configuration and runs no linter the repo does not have: the command exits with `1` and recommends the minimum per language.

| Language | Minimum recommendation |
| --- | --- |
| TypeScript and JavaScript | ESLint + `typescript-eslint` on `recommended`. |
| Python | Ruff with `select = ["E", "F"]`. |
| Go | `go vet ./...` and staticcheck in CI. |
| Java | Checkstyle with `google_checks.xml`. |
| C# | .NET analysers with `AnalysisLevel=latest-recommended`. |

## Examples

```sh
codarch lint .
codarch lint . --fail-on errors
codarch lint . --no-detect --config .codarch.yml
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Artifact written. It does not mean the code is clean: its counts do. |
| `1` | Invalid configuration, no tool measured (including «the project has no lint»), the artifact could not be written, or `--fail-on` found what it looked for. |

:::note[To learn more]
The decisions behind this page: [ADR 0096 — The lint belongs to the project](../desarrollo/adr/0091-0100/0096-el-lint-es-del-proyecto.md), [ADR 0099 — Lint is measured while analysing](../desarrollo/adr/0091-0100/0099-el-lint-se-mide-al-analizar.md), [ADR 0094 — El lint, en el mapa](../desarrollo/adr/0091-0100/0094-el-lint-en-el-mapa.md) and [ADR 0106 — Counts and paths come from the messages](../desarrollo/adr/0101-0110/0106-las-cuentas-y-las-rutas-del-lint.md). The 1.3 contract, with one example per state, is in [artifact 1.3](../desarrollo/lint-1.3.md). The app shows the systems and their rules under **Reglas**, in the project, folder and file sheets.
:::
