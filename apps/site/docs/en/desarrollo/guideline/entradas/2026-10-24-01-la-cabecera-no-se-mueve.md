---
title: The header does not move
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it was**: the documents had Starlight's header, without **Home** or **Guide**, so from an ADR
you could not go back to the rest of the site. And changing day in the guide reloaded the whole
page: the header and the timeline were mounted again and their animations were cut off.

**Decision**: the documents' header adds **Home**, **Guide** and **Documents** with a `Header`
override, without losing search, theme or GitHub. The guide is a single island: the header and the
timeline are mounted once and only the content below changes; the URL moves with
`history.pushState`, so each day keeps its own.

**Verdict**: **fix**, done. The site navigation is complete and the guide no longer reloads when
moving from one day to another.
