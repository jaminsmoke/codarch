---
title: "ADR 0007 — El nombre: CodArch"
description: "El nombre propuesto inicialmente fue ArchCode. Antes de registrarlo se comprobó el ecosistema:"
section: desarrollo
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: "El nombre: CodArch"
  order: 7
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

El nombre propuesto inicialmente fue **ArchCode**. Antes de registrarlo se comprobó el ecosistema:

- `archcode` en npm: publicado el 18/09/2026, CLI que renderiza `.arch` a SVG.
- `@archcode-io/engine`: "notación abierta para arquitectura de software… parser, modelo, checks
  semánticos, lenses, layout y SVG".
- `@archcode/mcp`: proxy MCP de inteligencia de código.
- `archcode.io` y la organización de GitHub, registrados.

Mismo nombre, mismo nicho, mismo vocabulario. Además aparecieron otros tres productos de 2026 en la
órbita (`archmap`, `fondamenta-archcode`, `codebase-visualization`), lo que confirma que el espacio
se está poblando y que el nombre debe registrarse pronto.

## Criterios

1. Disponible en npm, GitHub y al menos un dominio `.dev`/`.io`.
2. Se escribe igual en español y en inglés, sin tildes ni eñes.
3. Corto y pronunciable.
4. Sin aspecto de imitación de un competidor.
5. Que describa el producto sin encerrarlo en una sola función.

## Decisión

**CodArch** — contracción de *code* + *arch*.

- Producto: `CodArch`
- Nombre largo descriptivo: `Visual CodArch`
- CLI y paquete npm: `codarch`
- Organización: `codarch`

Verificado el 2026-10-20: `codarch` libre en npm, org de GitHub libre, y `codarch.dev`, `.io`,
`.com`, `.app` sin DNS.

## Consecuencias

- Registrar ese mismo día: npm scope `@codarch`, org de GitHub, dominio principal y variantes.
- Revisar marca registrada antes del lanzamiento público (no antes de validar el producto).
- No usar `ArchCode`, `ArkCode` ni variantes tipográficas: generan confusión y dañan el
  descubrimiento.

## Alternativas descartadas

- **ArchCode.** Colisión directa con un producto del mismo nicho.
- **Trazado / Architrave / Cadastre.** Viables y verificadas, pero descartadas por preferencia.
- **ArkCode.** Variante tipográfica de un competidor: peor descubrimiento y riesgo de marca.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M0.
