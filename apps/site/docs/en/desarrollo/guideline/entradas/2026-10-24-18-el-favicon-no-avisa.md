---
title: The favicon stops warning
date: "2026-10-24"
category: fix
verdict: arreglo
---

**What it is**: the dev server no longer warning on every load because the browser asks for
`/favicon.svg` outside the document.

**Why**: the browser marks that request as `cross-site` and Astro's router blocks cross-site
requests in development. The icon is a public SVG and the warning repeated on every reload, hiding
the warnings that do matter.

**What changed**: `vite-plugin-favicon.ts` serves the SVG from the top of the middleware stack,
serve-only and for that path only. Every other cross-site request is still blocked with 403
(checked), so the server's protection is not relaxed. Production does not change: the file stays in
`public/`.

**Verdict**: **fix**, no ADR: it is a development-server annoyance, not product behaviour.
