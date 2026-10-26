---
title: The public plugin registry
date: "2026-10-21"
category: feature
verdict: idea
---

**What it is**: third parties publishing plugins and the apps being able to install them. Today
plugins are **part of the repo**: a team that writes a rule for everyone has to ship it as code.

**Why**: the value of plugins is that they are used by **people who are not CodArch**.

**What is missing**: trust. A plugin is arbitrary code → it needs a **signature** (who publishes
it), a **registry** (where it is found) and a **version policy** (what happens when the plugin
changes the snapshot → the checksum).

**Verdict**: **phase + ADR**. It is a product decision (opening the door to third parties) and it
affects distribution.

**One half is already solved**: **addons**
([ADR 0029](../../adr/0021-0030/0029-los-addons.md)) are **data** —profiles, rules and saved
views— and shipping data does not need signed code: a zip and a hash are enough (see
*The addons*). What is still missing is **signing and distributing plugins** (code), which is
the other half.

**Size**: medium. The hard part is not the registry (an index and an endpoint) but the signature
and the rules.
