---
title: "ADR 0107 — La cobertura del lint es 1.3"
description: "El artefacto sube a 1.3. coverage dice qué se miró, files solo guarda hallazgos, y scopeHealth interpreta un fichero, una carpeta o el proyecto sin un estado guardado aparte."
section: desarrollo
status: enmendado por 0110
date: "2026-11-06"
sidebar:
  label: La cobertura del lint
  order: 107
---

**Estado:** enmendado por [ADR 0110](0110-el-lint-limpio-se-llama-limpio.md) en el punto 5 · **Fecha:** 2026-11-06

## Contexto

Las cuentas ya salen de los mensajes ([ADR 0106](0106-las-cuentas-y-las-rutas-del-lint.md)). Faltaba decir **qué se miró**. `summary.measured` era un número global que un artefacto viejo podía traer sin que se supiera el universo, y un fichero limpio desaparecía del mapa de `files` sin dejar rastro de que se había mirado.

## Decisión

1. El esquema pasa a **1.3**. Se añaden `domain` (`code` o `docs`) y `coverage.tools`. Los nombres de los ficheros no cambian.
2. `files` sigue siendo solo hallazgos. Los ficheros limpios que una herramienta enumeró viven en `measuredPaths`.
3. `scopeHealth` es una función pura. No se guarda salud por carpeta. La config no se duplica: se deriva de `meta`.
4. Un 1.0–1.2 se lee como `unknown` + `legacy-global`. `summary.measured` solo se emite si la cobertura nueva lo deriva.
5. ESLint y Checkstyle enumeran y dejan el universo en `null`, así que el código no queda `complete`. Los documentos sí: la cobertura es por documento, no por regla. oxlint, Biome, Ruff, go vet y dotnet quedan en `unknown-eligibility` y conservan los hallazgos.

El detalle, con un ejemplo por estado y por código, está en [el artefacto 1.3](../../lint-1.3.md).

## Consecuencias

- Cero hallazgos no es limpio. Hace falta `complete`, `fresh === true`, `findings === 0` y `eligible > 0`.
- `--fail-on` sigue mirando las cuentas observadas, no la cobertura.
- La UI no cambia en esta entrega.

## Alternativas descartadas

- **Dejar el esquema en 1.2** y colar `coverage` sin decirlo. Quien lee un 1.2 no puede distinguir «no se sabe» de «se midió todo».
- **Inventar `measured: 0`** cuando no hay enumeración. El cero pasaría por limpio.

## Hoja de ruta

Sin fase nueva.

- ✅ Tipos, `scopeHealth` y lectura 1.3.
- ✅ CLI, MCP y el formato. La UI no entra aquí.
- ✅ El punto 5 queda enmendado por el [ADR 0110](0110-el-lint-limpio-se-llama-limpio.md): el universo
  se escribe cuando la herramienta lo declara, y el código puede quedar `complete`.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
