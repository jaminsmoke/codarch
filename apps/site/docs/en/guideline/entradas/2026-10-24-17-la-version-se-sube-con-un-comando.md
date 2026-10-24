---
title: The version goes up with a command
date: "2026-10-24"
category: chore
verdict: adr
---

**What it is**: `npm run release`, a command that works out the next product version, writes it
everywhere it belongs and prepares the release. And a clear rule for the formats: they never bump on
their own.

**Why**: bumping the version was manual and full of doubts: which number, where it was written,
whether the web counted too. On top of that, it was easy to sweep unrelated changes into the bump
commit or bump from a branch with a dirty tree.

**What changed**: the version is `major.minor.patch`; **the patch is the normal one** and is the
default, while `minor` and `major` are asked for by hand (`npm run release -- minor`). The command
requires `main` and a clean tree, works out the version, runs `npm run version`, commits only the
version files and pushes; `--dry-run` touches nothing and `--no-push` keeps it local. The web carries
the same version as the desktop in its `package.json`, and `npm run version` fails if a package that
is not published takes a version of its own. The formats (`cc.json`, report, config, history,
chains) stay manual: they are contracts.

**Verdict**: **ADR 0051**, no open phase; it is maintenance.
