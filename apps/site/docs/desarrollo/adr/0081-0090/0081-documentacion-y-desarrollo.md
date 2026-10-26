---
title: "ADR 0081 — Documentación y Desarrollo, dos zonas"
description: "Enmienda ADR 0080: el sitio tiene dos zonas con su URL, su sidebar y su filtro de búsqueda. /docs/ es el producto; /desarrollo/ es cómo se construye, con los ADR y la guía."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: Documentación y Desarrollo
  order: 81
---

**Estado:** aceptado · **Fecha:** 2026-10-26 · **Enmienda:** [ADR 0080](../0071-0080/0080-usar-y-construir.md)

## Contexto

ADR 0080 separó los documentos en dos bloques de la misma sidebar, pero todo seguía bajo `/docs/`:
quien llegaba a instalar CodArch veía en el lateral los ochenta ADR, la búsqueda mezclaba el uso
con el diseño interno, «Siguiente» saltaba del FAQ al roadmap y la guía vivía aparte en `/guia/`.
Las páginas de uso, además, enlazaban ADR en mitad de las instrucciones y casi no tenían capturas.

## Decisión

1. **Dos zonas con su URL.** **Documentación** (`/docs/`) es solo el producto: la portada de
   `docs/index.md` y `docs/usar/**`. **Desarrollo** (`/desarrollo/`) es el roadmap, el modelo de
   datos, el diseño del mapa, la migración a Rust, los ADR y la guía en `/desarrollo/guia/`. Los
   ficheros viven en `apps/site/docs/usar/` y `apps/site/docs/desarrollo/` (y sus gemelas en
   `docs/en/`). La traducción de fichero a URL está en un único sitio, `src/lib/zonas.mjs`.
2. **El `section` es la zona.** El enum pasa a `usar | desarrollo` (deja `producto | construir |
   adr`); los ADR se reconocen por su carpeta `desarrollo/adr/`.
3. **Una sidebar por zona.** `sidebarUsar()` y `sidebarDesarrollo()` en `sidebar.mjs`; el
   componente `Sidebar` de Starlight se sustituye por uno que pinta solo la zona de la página, y
   «Anterior/Siguiente» no cruzan de zona.
4. **Cabecera: Inicio · Documentación · Desarrollo.** La guía está dentro de Desarrollo. La portada
   y el pie llevan a «Empezar» (instalación) y «Cómo se construye» (`/desarrollo/`).
5. **Búsqueda por zona.** Cada documento lleva el filtro de Pagefind `zona`, con el nombre de la zona
   en el idioma de la página (Documentación/Desarrollo, Documentation/Development). La búsqueda se
   abre con el filtro de la zona actual ya puesto, así que buscar «ADR» desde `/docs/` no devuelve
   solo ADR; el panel de filtros de Pagefind permite quitarlo y ver la otra zona.
6. **Las direcciones antiguas redirigen.** `/docs/adr/*`, `/docs/model`, `/docs/migration`,
   `/docs/design/map`, `/docs/rules`, `/docs/mcp`, `/docs/usar/cli/mcp` y `/guia/*`, también en
   `/en/`. Las dos páginas de MCP se unen en `docs/usar/mcp.md` y `rules.md` pasa a
   `docs/usar/reglas.md`.
7. **Las páginas de uso no enlazan ADR** salvo en una nota final «Para saber más». **Cada página de
   interfaz (webapp, escritorio, primeros pasos) lleva al menos una captura** en
   `docs/images/`, con los nombres que enseña la interfaz.

## Consecuencias

- Una página de uso nueva va en `docs/usar/` con `section: usar`; una de diseño, en
  `docs/desarrollo/` con `section: desarrollo`. Las dos con su gemela en `docs/en/`.
- Los enlaces del markdown siguen siendo relativos entre ficheros; el plugin de enlaces y
  `rutas.ts` calculan la zona.
- Los tests fijan las dos sidebars, las rutas de cada zona y las redirecciones.

## Alternativas descartadas

- **Dos sitios Starlight.** Duplica configuración, búsqueda e idiomas para separar dos listas.
- **Dejar todo en `/docs/` y ocultar los ADR en la sidebar.** La búsqueda y la paginación seguían
  mezclando las zonas y las URL no decían qué es cada cosa.
- **Mantener `/guia/` en la raíz.** La guía es parte de cómo se construye y la cabecera tendría
  cuatro entradas.

## Hoja de ruta

### Documentos — Dos zonas

- [x] Ficheros en `docs/usar/` y `docs/desarrollo/`, enum `usar | desarrollo` y redirecciones.
- [x] Sidebar por zona, cabecera, portada, pie y filtro de búsqueda.
- [x] Webapp, escritorio y primeros pasos con capturas por pantalla; MCP en una sola página.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
