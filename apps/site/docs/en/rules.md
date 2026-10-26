---
title: Architecture rules
description: "codarch diff can evaluate a versioned policy in .codarch.yml. Rules are not stored in the snapshot: the snapshot says how the code is; the configuration says…"
section: producto
sidebar:
  label: Architecture rules
  order: 50
---

`codarch diff` can evaluate a versioned policy in `.codarch.yml`. Rules are not stored in the
snapshot: the snapshot says **how the code is**; the configuration says **how it should be**.

## Example

```yaml
version: 1

layers:
  - name: domain
    paths:
      - src/domain/**
  - name: application
    paths:
      - src/application/**
  - name: infrastructure
    paths:
      - src/infra/**

rules:
  - name: domain-no-infra
    type: forbidden
    from: domain
    to: infrastructure
    severity: error
    message: The domain must not depend on infrastructure

  - name: max-complexity
    type: threshold
    metric: maxComplexity
    max: 40
    severity: warn

  - name: no-cycles
    type: cycles
    severity: error
```

## Profiles

A profile is a rule configuration written in advance. `codarch profiles` lists the catalogue:

```bash
codarch profiles
codarch profiles --json
```

Today's catalogue:

| Profile | For repos with | Layers |
|---|---|---|
| `capas` | `src/domain`, `src/application`, `src/infra` | domain, application, infrastructure |
| `hexagonal` | ports in the centre and adapters outside | domain, application, adapters |
| `onion` | their own presentation layer | domain, application, infrastructure, presentation |
| `ddd` | model, services and repositories | domain, application, infrastructure |

Repos organised **by module or feature** do not fit any static profile: their layers are decided by
the repository, which is why the generator proposes them
([ADR 0023](adr/0021-0030/0023-lente-de-dominio-por-pasos.md)).

To use a profile, in `.codarch.yml`:

```yaml
version: 1
profile: capas
```

The profile brings its layers and rules, and the team can add its own on top. What the profile
brings enters **as a warning** (`warn`): it advises, it does not block. A team rule with the same
name replaces the profile's, so tightening it means writing it again with `severity: error`:

```yaml
version: 1
profile: capas
rules:
  - name: domain-no-infrastructure
    type: forbidden
    from: domain
    to: infrastructure
    severity: error
```

In the report, each violation says where it comes from (`source: "config"` or
`source: "profile"`) and the report carries the applied profile (`rules.profile`). That way nobody
blocks a PR because of a rule they did not write, and tightening one is a conscious decision
([ADR 0023](adr/0021-0030/0023-lente-de-dominio-por-pasos.md)).

### Tightening a profile

By default a profile's rules are warnings. When the code is ready, they can be raised all at once:

```yaml
version: 1
profile: capas
profile_severity: error
```

A single rule can also be tightened by writing it in the team's file with the same name: the team's
rule replaces the profile's.

### Your own profiles

A team can save its conventions as a profile, in the same file:

```yaml
version: 1
profile: my-team
profiles:
  - id: my-team
    title: Team conventions
    layers:
      - name: core
        patterns: [src/nucleo/**]
      - name: extras
        patterns: [src/extras/**]
    rules:
      - name: core-without-extras
        type: forbidden
        from: core
        to: extras
```

Your own profiles have the same shape as the catalogue's and also enter as warnings.

## Generating the layers

If the repo does not fit any profile, `codarch suggest` deduces the structure from the code itself:

```bash
codarch suggest .codarch/snapshot.cc.json
codarch suggest .codarch/snapshot.cc.json --json
```

Group the files by folder, look at the dependency graph and order the layers from the innermost to
the outermost. With that it proposes layers and the rules that would protect them, in a fragment
ready for `.codarch.yml`:

```yaml
version: 1
layers:
  - name: src/domain
    paths:
      - src/domain/**
  - name: src/infra
    paths:
      - src/infra/**
rules:
  - name: src-domain-without-src-infra
    type: forbidden
    from: src/domain
    to: src/infra
    severity: warn
    message: src/domain must not depend on src/infra
```

It is **version 0.01** of the generator: it groups by the first and second directory level and
assumes dependencies point inwards. Loose files at the root (the entry points) do not form a layer,
and the command says so.

It also says **which catalogue profile fits** what it deduced, and whether the code currently
breaks any of its rules:

```
  Fit with the profile catalogue:

    capas        2 of 3 layers · covers 100% of the code
    hexagonal    2 of 3 layers · covers 100% of the code
    onion        2 of 4 layers · covers 100% of the code

  With the "capas" profile, the code breaks 1 rule today:
    · The domain must not depend on infrastructure
```

When a profile fits, the proposal uses **its** layers and rules, not the ones deduced from the
code: the convention comes from the profile. If none fits, the proposal is deduced from the graph
(and then the layer order comes from what the code already does).

It proposes, it does not decide: the output is reviewed and pasted. Like profile rules, they come
out as warnings.

## Layers
- `patterns` (or its alias `paths`) are globs relative to the project root, with `/`.
- They are evaluated in order: **the first matching layer wins**.
- A file with no layer does not take part in `forbidden` rules.
- Patterns cannot be absolute. `\` is normalised to `/`.
- For a layer rule, only the internal edges the analyser could resolve count.

## Rules

### `forbidden`

```yaml
- name: domain-no-infra
  type: forbidden
  from: domain
  to: infrastructure
  severity: error
  message: "The domain must not depend on infrastructure"
```

Marks every head edge that goes from `from` to `to`. The violation key is the rule and the pair of
file ids, so moving the same import does not create a new violation.

### `threshold`

```yaml
- name: max-complexity
  type: threshold
  metric: maxComplexity
  max: 40
  severity: warn
```

Evaluates the metric per file. `max`, `min` or both can be used; at least one is required. If the
metric does not exist in a file, it is not evaluated. A new file that is already out of range
counts as an introduced violation.

`maxComplexity` includes all implemented functions, including anonymous callbacks. The symbols lens
only lists named declarations; the two figures may not match
([ADR 0040](adr/0031-0040/0040-la-complejidad-del-cuerpo-entero.md)).

### `cycles`

```yaml
- name: no-cycles
  type: cycles
  severity: error
```

Marks the strongly connected components of head (size > 1 or self-loop) **of the runtime graph**:
an edge counts if `weight > typeOnly`. Type-only imports stay in the snapshot, but they do not
close a cycle or break this rule ([ADR 0037](adr/0031-0040/0037-los-ciclos-de-ejecucion.md)). The
key uses the component's ids: a cycle that changes size appears as one resolved and another
introduced.

## Severity and gate

| Severity | Shown | `--fail-on violations` |
|---|---|---|
| `info` | yes | no |
| `warn` | yes | no |
| `error` | yes | yes, if introduced |

`--fail-on`:

- `none`: never fails because of findings (default).
- `cycles`: fails if there are new cycles.
- `violations`: fails if there are **introduced** violations with `error` severity.
- `hotspots`: fails if there are new hotspots.
- `any`: combines the previous three.

The exit code is `2` when the gate fails and `1` when there is a read or configuration error. That
way a workflow can tell "the PR breaks the policy" from "the tool failed".

## What counts as new

Base and head are evaluated and the violations' stable keys are compared:

- `introduced`: present in head and not in base.
- `existing`: present in both; it is previous debt and does not block.
- `resolved`: present in base and no longer in head.

This allows adopting rules in a repo with debt without freezing every PR.

## Loading

- `codarch diff base.cc.json head.cc.json` looks for `.codarch.yml` or `.codarch.yaml` in the cwd.
- `--config path.yml` uses another policy.
- `--no-config` disables rules entirely.

The configuration is not copied into the snapshot or the map. The report includes a `rules` block
with the summary and the violations; see [model](model.md#delta).

## Scope

`ignore` is a list of patterns with `.gitignore` syntax, relative to the project root. It is not a
rule: it is applied **before** walking ([ADR 0038](adr/0031-0040/0038-el-alcance-del-analisis.md)),
so an excluded file does not enter the snapshot, the metrics, the cycles or the checksum.

- `codarch analyze` and `codarch serve` read the root `.codarch.yml`; the browser analysis reads
  the same file when opening the repository.
- `codarch analyze --config <file>` uses another file; `--no-config` reads none.
- `--ignore <pattern>` adds an exclusion for that run; it does not replace the repo's list.
- `diff`, `render` and `inspect` consume the snapshot and do not filter again.
- The MCP's `get_project_config` returns `ignore` so an agent can explain the scope.

There is no default exclusion of tests or fixtures: each repo decides what is architecture.

## Current limits

- There are no rules at symbol level or on aggregated folders.
- There is no per-line `ignore` in rules or a separate baseline; debt is recognised by comparison
  with base. The `.codarch.yml` `ignore` is about scope, not rules.
- Globs do not understand TypeScript's `@/` alias: they apply to paths already resolved in the tree.
- Rules do not modify code or generate fixes.
