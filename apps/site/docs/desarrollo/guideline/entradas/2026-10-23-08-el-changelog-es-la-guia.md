---
title: El changelog es la guía
date: "2026-10-23"
category: docs
verdict: adr
---

**Qué es**: que el registro de lo hecho viva en esta guía, no en un `<adr>.changelog.md` al lado de
cada decisión, y que cada día tenga su página.

**Por qué**: la guía ya cuenta lo que se hizo y lo que espera, por fecha y por categoría. El sidecar
repetía esa historia por decisión y obligaba a escribir dos veces lo mismo. Además, una sola página
con todos los días crecía sin límite.

**Decisión**: [ADR 0047](../../adr/0041-0050/0047-el-changelog-es-la-guia.md). Los sidecars
desaparecen; el ADR conserva la decisión y su hoja de ruta. La guía se parte en `/guia/` (el último
día), `/guia/AAAA-MM-DD/`, `/guia/futuro/` y `/guia/normas/`; la línea del tiempo enlaza a cada una.

**Veredicto**: **ADR 0047**, hecho. El registro tiene una sola fuente y cada día su URL.
