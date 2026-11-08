---
title: "ADR 0110 — El lint limpio se llama limpio"
description: "Cada herramienta declara su universo —ESLint con sus resultados y oxlint con --debug=files—; la falta de archivo de configuración se dice, pero no impide llamar limpio a lo que se midió entero."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: El lint limpio se llama limpio
  order: 110
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Enmienda** el punto 5 del [ADR 0107](0107-la-cobertura-del-lint.md) y la decisión 3 del
[ADR 0109](0109-la-salud-del-lint-se-lee-junta.md), que dejaban el universo de ESLint en `null` y, con
eso, el código siempre en `partial`. También enmienda el punto del
[ADR 0104](0104-el-lint-se-lee-por-hallazgos.md) que no enseñaba los sistemas en la ficha: ahora se
enseña la **nota que cualifica la medida**, no el catálogo de reglas.

## Contexto

En este repo la ficha de proyecto decía «Cobertura parcial: sin hallazgos observados en lo medido. No se
sabe qué ficheros eran elegibles» con ESLint y oxlint a cero sobre 685 y 731 ficheros. El cero era
cierto; el «parcial» venía de dos cosas: `eligiblePaths` no se escribía nunca —quedaba en `null`— y
oxlint no enumeraba. El motivo, además, no decía lo que de verdad pasaba: oxlint estaba instalado como
dependencia y no tenía archivo de configuración.

## Decisión

1. `coverage.tools[].eligiblePaths` se escribe. Sigue siendo el contrato **1.3**: el campo ya existía y
   el `text` de un motivo ya era libre; no hay 1.4.

2. El universo lo declara cada herramienta, no el snapshot:

   - **ESLint**: su JSON devuelve también los ficheros limpios. En una pasada sobre la raíz, lo
     devuelto es el universo.
   - **oxlint**: `--debug=files` imprime la lista exacta de ficheros que va a lintar. Esa lista es
     `eligiblePaths` y `measuredPaths` de la pasada.
   - **Checkstyle, Biome, Ruff, go vet y dotnet**: si no listan los limpios, siguen `unknown` con un
     motivo que diga **por qué**. Ruff podrá usar `--show-files` cuando se conecte; no entra aquí.
   - Un bloque `lint:` de `.codarch.yml` puede declarar `list`, un comando que imprime una ruta por
     línea. Sin `list` no se supone universo.

3. `scopeHealth` no cambia de forma: `complete` exige que cada herramienta cubra **su propio** universo
   en el ámbito. `isCurrentClean` sigue pidiendo `complete`, `fresh === true`, cero hallazgos y
   `eligible > 0`.

4. Una herramienta instalada **sin archivo de configuración** lo dice con esas palabras en
   `meta.systems[].note`: «sin archivo de configuración: corre sus reglas por defecto y no se
   enumeran». No bloquea `complete`: la config cambia qué reglas corren, no qué ficheros se midieron.
   La ficha de proyecto enseña una fila por herramienta —estado, config, reglas y medidos— y la nota
   en su fila; el catálogo sigue en **Reglas**.

5. La ficha de proyecto, carpeta y fichero dice **«Limpio y al día»** cuando `isCurrentClean`. Si no,
   enseña los errores, avisos e info y los motivos. Con cero hallazgos no se pinta la tira de ceros: se
   dice limpio.

6. El checksum cambia solo porque cambia el contenido de `coverage`; el contrato sigue en 1.3 y los
   artefactos viejos se leen igual.

## Consecuencias

- Un proyecto medido entero y sin hallazgos deja de parecer dudoso, y lo mismo una carpeta o un
  fichero.
- «Medidos N» cuenta la unión de lo que cada herramienta midió, limpios incluidos.
- Una herramienta sin config ya no se confunde con una cobertura desconocida: se ve la nota.
- El riesgo no reescala nada: lee los mismos recuentos.

## Alternativas descartadas

- **Deducir el universo del snapshot.** No todas las herramientas lintan las mismas extensiones: oxlint
  entra en `.astro` y ESLint no.
- **Llamar completo a cualquier ejecución sin lista.** Sería inventar el universo que el ADR 0107 quiso
  no inventar.
- **Bloquear «limpio» por la falta de config.** La config no cambia los ficheros; cambia las reglas, y
  eso ya se dice aparte.
- **Subir a 1.4 por un motivo nuevo.** El texto del motivo ya cabe en 1.3; una versión nueva rompería
  lectores por una nota.

## Hoja de ruta

Sin fase nueva.

- ✅ La decisión.
- ✅ El universo por herramienta: ESLint desde sus resultados, oxlint con `--debug=files` y `list` en
  `.codarch.yml`.
- ✅ La nota de configuración ausente y «Limpio y al día» en las fichas de proyecto, carpeta y fichero.
- ✅ Una fila por herramienta en la ficha de proyecto: estado, config, reglas y ficheros medidos.
- ✅ Tests: limpio en los tres ámbitos, oxlint enumerado, config ausente y checksum estable.
- ✅ La página del artefacto 1.3 y la guía del CLI.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
