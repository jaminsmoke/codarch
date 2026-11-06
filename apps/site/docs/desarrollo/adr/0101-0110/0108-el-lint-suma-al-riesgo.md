---
title: "ADR 0108 — El lint suma al riesgo"
description: "El lint deja de reescalar la base. Suma un término antes de gamma, solo con la salud de cada fichero, y el índice 0..100 es la suma de las contribuciones."
section: desarrollo
status: aceptado
date: "2026-11-06"
sidebar:
  label: El lint suma al riesgo
  order: 108
---

**Estado:** aceptado · **Fecha:** 2026-11-06

**Enmienda** el punto 3 del [ADR 0094](../0091-0100/0094-el-lint-en-el-mapa.md) y no toca los pesos de la base del [ADR 0008](../0001-0010/0008-diseno-mapa-2d.md). La cobertura que se lee es la del [ADR 0107](0107-la-cobertura-del-lint.md). La fórmula, con los casos, está en [el riesgo](../../riesgo.md).

## Contexto

Con artefacto, el riesgo reescalaba la base para dejar un 20 % al lint: complejidad 0,40, churn 0,256, tamaño 0,144 y lint 0,20. Un fichero sin hallazgos bajaba, porque ese 20 % pesaba cero. Un fichero que no estaba en `files` se rellenaba con cero y contaba como medido. La salud del proyecto, si se usaba, decía lo mismo de todos.

Eso mezcla tres cosas distintas: la base del snapshot, la deuda observada y el hecho de no haber podido comparar el árbol.

## Decisión

1. La base B no cambia. Complejidad 50 %, churn 32 % y tamaño 18 %, renormalizados si falta una señal, normalizados por su p95. Gamma sigue en 1,7. Las carpetas siguen agregando por máximo.
2. El lint no es una cuarta señal de esa base. Con deuda que entra, se suma antes de gamma y nunca resta:

   `D = errores + 0,25·avisos` (info no cuenta)

   `nL = clamp(D / 10, 0, 1)`

   `raw = min(B + 0,2·nL, 1)`

   `risk = raw^1,7` en 0..1

   `score = 100·raw^1,7` en 0..100

   α = 0,2 y Dsat = 10 son provisionales: no están calibrados. `RISK_WEIGHTS_WITH_LINT` se queda exportado como metadato de la ficha; el índice no lo usa.
3. Quien calcula el riesgo pasa `lintView` de **cada fichero**, copiada de su `scopeHealth`: `fresh`, `counts`, `coverage` (`state`, `eligible`, `measured`, `reasons`), `applicability` (`applicable`, `na` o `not-found`) y `reason`. No se pasa la salud del proyecto. No se pasa el artefacto entero. Si no hay artefacto, no hay vista: no se inventa un 0.
4. Si el fichero trae `lintView`, manda sobre el número legado y sobre `options.lint`. El número legado solo es puente para quien aún no tiene vista.
5. La deuda entra con `fresh === true` y cuentas válidas, aunque la cobertura sea `unknown`, `partial` o `unmeasured`: es un mínimo observado, no una medida cerrada. `fresh === false` o `null` no penaliza. `fresh === null` sigue siendo «no hubo comparación», con motivo `freshness-unverified`.
6. No aplicable y no encontrado no se colapsan. `na` sale de `eligible === 0`, de `not-eligible` o `no-eligible`, o de `applicability: "na"` con un motivo. `not-found` es otro estado: no es cero ni es no aplicable.
7. `contributions` de complejidad, churn, tamaño y lint tienen `points`, `percent` y `weight`. Los `points` que no son null suman `score`. `weight` es el peso nominal, no el porcentaje ni la parte renormalizada. `points` null significa que la señal no entra.

`risk` sin término de lint es el de la base sola, el mismo de antes de este término.

## Consecuencias

- Un mapa con dos ficheros puede no mover el color: el p95 es el menor, los dos saturan a 1 y sumar lint no pasa de 1. Hacen falta hallazgos y una base que no esté ya en el tope.
- Cero hallazgos con árbol al día suma cero. No baja el riesgo del resto.
- La lente de deuda sigue pintando `errores + 0,25·avisos`. Eso no es el término del índice.
- La ficha que aún lee `parts.lint.weight` ve 0: en el desglose de la base ese peso no existe. Las contribuciones de la ficha las cierra el frontend sobre esta rama.
- α y Dsat se pueden cambiar sin tocar el contrato de `scopeHealth`.

## Alternativas descartadas

- **Seguir reescalando al 20 %.** Un cero de lint bajaba ficheros que nadie había podido declarar limpios.
- **Rellenar con 0 los ficheros ausentes de `files`.** Ausencia y deuda cero dejaban de distinguirse.
- **Usar la salud del proyecto para todos.** Un hallazgo en un fichero teñía el índice de los demás.
- **No sumar nada si la cobertura es `unknown`.** Se tiraban errores que sí se vieron. Entran como mínimo observado, y no se llama limpio.

## Hoja de ruta

Sin fase nueva.

- Hecho: la fórmula en `@codarch/metrics` y el cable del render, del MCP y de la captura.
- Queda fuera: la fila de contribuciones en la ficha. El frontend la parchea sobre esta rama.
- Queda abierto: calibrar α y Dsat. Hoy son provisionales.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
