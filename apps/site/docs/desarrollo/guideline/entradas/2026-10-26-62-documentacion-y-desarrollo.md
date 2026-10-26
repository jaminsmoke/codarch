---
title: Documentación y Desarrollo
date: "2026-10-26"
category: docs
verdict: adr
---

**Qué era**: los dos bloques de ADR 0080 compartían `/docs/`, la sidebar, la búsqueda y la paginación; quien venía a instalar CodArch veía los ADR en el lateral, y la guía vivía aparte en `/guia/`.

**Qué cambió**: dos zonas. **Documentación** (`/docs/`) es solo el producto; **Desarrollo** (`/desarrollo/`) junta roadmap, modelo, diseño, migración, ADR y la guía (`/desarrollo/guia/`). Cada zona tiene su sidebar y su filtro de búsqueda, que la búsqueda aplica por defecto; la cabecera es Inicio · Documentación · Desarrollo y las direcciones antiguas redirigen. Las dos páginas de MCP son una, y webapp, escritorio y primeros pasos se explican pantalla a pantalla con capturas.

**Veredicto**: [ADR 0081](../../adr/0081-0090/0081-documentacion-y-desarrollo.md), que enmienda ADR 0080.
