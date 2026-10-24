---
title: The guide, compact and filterable
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it was**: each category was a card with border, background and shadow, and each entry
another card inside. The day grew long and the categories you did not care about still took up
space.

**What was done**: the card chrome was removed from the groups (no border, no background, no
shadow): a color rail on the left and a compact header (dot + name + count). Entries are a flat list
separated by thin lines. The category chips in the day header are now buttons that hide or show
their category; if all are hidden, "Show all" appears.

**Verdict**: **fix**, no ADR (it is UI, not model). It changes neither the checksum nor the routes.
