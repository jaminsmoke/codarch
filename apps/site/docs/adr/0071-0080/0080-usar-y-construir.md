---
title: "ADR 0080 — Usar CodArch y cómo se construye"
description: "Los documentos se separan en dos bloques: lo que necesita quien usa CodArch (instalación, CLI, apps, reglas, acción) y lo que explica cómo se construye (roadmap, modelo, diseño, ADR, guía)."
section: adr
status: aceptado
date: "2026-10-26"
sidebar:
  label: Usar CodArch y cómo se construye
  order: 80
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

La sidebar tenía un solo bloque «El producto» que mezclaba el roadmap, el modelo de datos, el diseño
del mapa y la migración a Rust con las reglas y el MCP. Quien llegaba a instalar CodArch no
encontraba la instalación, ni una página por comando del CLI, ni cómo abrir la webapp o el
escritorio; quien venía a entender el diseño tenía que saltarse lo de uso. La portada, además,
contaba la webapp como si analizara sola en el navegador y `codarch serve` como otra forma de
instalar.

## Decisión

1. **Dos bloques en la sidebar.** **Usar CodArch** (`section: producto`): instalación, primeros
   pasos, el CLI con una página por comando, webapp, app de escritorio, reglas de `.codarch.yml`,
   MCP, GitHub Action, actualizaciones y preguntas frecuentes. **Cómo se construye**
   (`section: construir`): roadmap, modelo de datos, diseño del mapa, migración a Rust, las
   decisiones (`section: adr`) y la guía.
2. **El `section` decide el bloque.** El enum del esquema pasa a `producto | construir | adr`; la
   sidebar se sigue generando del frontmatter (ADR 0046) y el orden sale de `sidebar.order`.
3. **Las páginas de uso viven en `docs/usar/`** y los comandos en `docs/usar/cli/`, que la sidebar
   agrupa en «CLI». `rules.md` y `mcp.md` se quedan en su ruta para no romper enlaces y entran en el
   bloque de uso por su `section`.
4. **Tres vías de instalación, una verdad.** CLI + webapp es una sola instalación
   (`npm i -g codarch`; la webapp se abre con `codarch serve`); la webapp sola con Docker
   (`ghcr.io/jaminsmoke/codarch-web:latest`, `docker compose up --build` solo desde el repo
   clonado); y el instalador de escritorio desde las Releases. La portada, el README y las páginas
   de uso lo cuentan igual.
5. **Cada página nueva tiene su gemela en `docs/en/`** con la misma ruta relativa.

## Consecuencias

- Quien usa CodArch encuentra todo en el primer bloque sin pasar por el diseño interno.
- Añadir una página de uso es crear el `.md` en `docs/usar/` con `section: producto`; un documento
  de diseño, con `section: construir`.
- El test de la sidebar fija el orden de los dos bloques y la lista de comandos del CLI.

## Alternativas descartadas

- **Mantener un solo bloque y ordenar mejor.** Seguía mezclando dos públicos distintos.
- **Mover `rules.md` y `mcp.md` a `docs/usar/`.** Rompe enlaces desde ADR, guía y README sin ganar
  nada: el bloque lo decide el `section`, no la carpeta.
- **Renombrar `producto` a `usar`.** Más claro, pero obliga a tocar todas las páginas ya escritas;
  la etiqueta visible ya dice «Usar CodArch».

## Hoja de ruta

### Documentos — Usar y construir

- [x] Enum `section`, sidebar en dos bloques y test.
- [x] Roadmap, modelo, diseño del mapa y migración pasan a «Cómo se construye».
- [x] Primeros pasos, webapp, escritorio, GitHub Action y preguntas frecuentes, con su gemela.
- [x] Portada y README con las tres vías de instalación.
- [ ] Instalación, una página por comando del CLI y actualizaciones.
- [ ] Las capturas marcadas como pendientes en las páginas de uso.

El registro de lo hecho vive en el [feed de la guía](/guia/).
