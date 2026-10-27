---
title: "codarch scopes"
description: "Lists the scopes below a root and warns about drift: which .codarch/ folders exist, with their checksum, commit and date."
section: usar
sidebar:
  label: "scopes"
  order: 27
---

Lists the `.codarch/` folders below a root, without opening each snapshot in full.

## Usage

```sh
codarch scopes [path] [options]
```

## Options

| Option | What it does |
| --- | --- |
| `--root <path>` | The root to look at (the current one by default). |
| `--json` | Machine-readable output. |
| `-h, --help` | Help. |

## Output

A table with each scope, its files, its checksum, the date of its latest snapshot and its state:

- **up to date**: its checksum is the same one the parent saw.
- **analyzed again**: its checksum changed since the parent's last analysis.
- **new**: the parent did not have it in its register.
- **no longer there**: it was in the register and has no snapshot now.
- **newer files**: its snapshot is older than some file in its folder, so it may not tell what is there today.

## How it is filled

`codarch analyze` records in `.codarch/scopes.json` which `.codarch/` folders it saw below, with their
checksum, commit and date. It reads downwards and **does not write** into a child's `.codarch/`: each
scope is written by whoever analyzes that scope. The register is derived and can be deleted.

The search uses the same exclusions as the analysis: a folder left out by `.gitignore` —or by the
scope in `.codarch.yml`— does not count as a scope of the parent.

## Examples

```sh
codarch analyze .            # analyze the root and record nested scopes
codarch scopes               # list them with their state
codarch scopes --root apps   # look at the scopes inside apps/
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Listed (also when there are no nested scopes). |
| `1` | Missing folder or invalid option. |
