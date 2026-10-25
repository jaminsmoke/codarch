---
title: Every component, its own version
date: "2026-10-25"
category: chore
verdict: adr
---

**What it was**: one version for everything. `versions.json` had `product` and the CLI, desktop, web and MCP shared it. Shipping a batch forced a global number, and the CLI was only published by hand: npm stayed at `0.3.1-alpha.3` while the product moved on to `0.3.20`.

**What changed**: `versions.json` stores `engine`, `cli`, `desktop`, `web`, `mcp` and `docker`; each `package.json` carries its own and `@codarch/versions` exports one constant per component. After CI is green on `main`, a coordinator looks at the diff since the last release, computes impact over the **dependency graph** (not folders), bumps the patch of what is affected in a single commit, and fires the channels: npm, desktop release and Docker. The web travels inside the CLI, so a web change also bumps the CLI. `minor`/`major` remain manual with `npm run release -- --cli minor`. Settings gain **Components**, with each piece's version and update path.

**Numbers**: six components instead of one global number. A change in `apps/cli` bumps CLI and Docker; one in desktop only desktop; one in `packages/ui` bumps engine, CLI, desktop, web and Docker, but not MCP. The first pass brings npm up to date, and the first automatic patch is `0.3.21`. The checksum and formats do not change.

**Verdict**: [ADR 0065](../../adr/0061-0070/0065-cada-componente-su-version.md), done. Its roadmap keeps the CLI update notice inside the apps and splitting the web from the CLI package if it ever stops travelling inside.
