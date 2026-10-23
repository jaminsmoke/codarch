---
title: ADR 0006 — Nodos = ficheros, preparados para símbolos
description: Modelar clases y funciones como nodos da hotspots por función y aristas reales de uso. También multiplica el grafo (10x), exige un parser semántico por lenguaje y hace…
section: adr
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: Nodos = ficheros, preparados para símbolos
  order: 6
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

Modelar clases y funciones como nodos da hotspots por función y aristas reales de uso. También
multiplica el grafo (~10x), exige un parser semántico por lenguaje y hace que el primer resultado
tarde meses.

El objetivo declarado es una herramienta completa, pero construida **despacio, con seguridad y de
forma incremental**.

## Decisión

En la v1, **un nodo es un fichero**. Las carpetas son agrupaciones; los símbolos no son nodos.

Lo que sí hacemos desde el principio:

1. **Agregados por fichero** que capturen la señal sin modelar símbolos: `functions`,
   `maxComplexity`, `maxFunctionLength`, `longestChain`.
2. **Interfaz de parser preparada**: `parse(file) → { metrics, imports, symbols? }`. Si un parser
   devuelve símbolos, se guardan en una lente aparte; si no, no pasa nada.
3. **Ids independientes de la profundidad**: un id de símbolo, cuando exista, será
   `sha256("Symbol/<ruta>#<nombre>")[:16]`, no un hijo del id del fichero. Así la lente de símbolos
   se añade sin romper nada.
4. **Importación de `leafEdges`** de cc.json 2.x: se preservan, aunque la v1 no los produzca.

## Consecuencias

- El grafo de la v1 es pequeño y el análisis rápido.
- Los hotspots son por fichero. Es menos preciso, y es suficiente para detectar el 80% de los
  problemas reales.
- La lente de símbolos es aditiva: no requiere migrar datos ni cambiar ids.
- Riesgo: una métrica que solo tenga sentido por función habrá que agregarla con cuidado (máximo,
  no media) para no mentir.

## Alternativas descartadas

- **Ficheros + símbolos desde el inicio.** Retrasa el primer resultado y multiplica el coste de cada
  parser por cada lenguaje.
- **Símbolos primero.** El grafo se vuelve inmanejable antes de tener producto.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M0.

El detalle de lo hecho está en el [changelog](0006-nodos-fichero.changelog.md).
