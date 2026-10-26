---
title: ADR 0010 — Diff entre snapshots y reporte estable
description: "M2 necesita responder a la pregunta del PR: ¿qué ha cambiado en la arquitectura entre estos dos commits? Ya tenemos snapshots inmutables y deterministas. El diff no debe…"
section: desarrollo
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: Diff entre snapshots y reporte estable
  order: 10
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

M2 necesita responder a la pregunta del PR: **¿qué ha cambiado en la arquitectura entre estos dos
commits?** Ya tenemos snapshots inmutables y deterministas. El diff no debe ser un texto plano de
JSON ni un tercer formato que haya que sincronizar: debe ser una consulta entre dos snapshots.

## Decisión

1. **El diff es una función pura** en `packages/metrics`, no lógica del CLI. `codarch diff` solo
   carga, valida, escribe el reporte y decide el código de salida.
2. **Identidad por `id`, no por ruta.** Un rename es un fichero eliminado y otro añadido; se evita
   emparejar por nombre, que produce falsos positivos. Las rutas del árbol solo se usan para
   mostrar.
3. **Reporte `schemaVersion: "1.0"` estable.** Sin timestamps, sin rutas absolutas, arrays
   ordenados. El mismo par de snapshots produce el mismo `report.json`.
4. **Cambios de métricas sobre la unión de claves.** Si una métrica aparece o desaparece, `delta`
   es `null`; no se inventa un cero. Así se distingue "nuevo" de "mismo valor".
5. **Aristas por `(fromId, toId)`.** Si hay duplicados, se agregan peso y type-only. La lista
   `cyclicAdded` / `cyclicRemoved` usa el flag `isCyclic` del snapshot.
6. **Ciclos por SCC, no por flags.** El reporte calcula componentes fuertemente conexos de cada
   snapshot (incluidos self-loops) y compara el conjunto de ids de cada componente:
   `introduced` = está en head y no en base; `fixed` = al revés. Un cambio de tamaño aparece como
   un ciclo resuelto y otro introducido, que es la lectura correcta.
7. **Hotspots transparentes.** Por defecto `maxComplexity`; si no existe, `rloc`. Se incluyen
   ficheros añadidos o modificados con delta positivo; un fichero nuevo parte de `0`. Se ordena por
   delta, luego por valor head, y se limita a `top` (10). No hay una fórmula compuesta opaca.
8. **Gate explícito.** `--fail-on cycles|hotspots|any` devuelve `2` cuando falla; `1` queda para
   errores de lectura o validación. Las reglas de capas y `.codarch.yml` llegan después, y vivirán
   fuera del snapshot.

## Consecuencias

- El reporte se puede publicar como artefacto de CI y consumir por el bot o por MCP sin parsear
  HTML.
- Comparar snapshots generados en ramas distintas es barato: no se vuelve a analizar el código.
- Un rename se reporta como alta + baja. Es deliberado y se puede mejorar más adelante con
  content hash, sin cambiar el contrato.
- El reporte de un cambio grande puede crecer; se puede filtrar en la action o añadir un modo
  `--summary` cuando duela.
- Las violaciones de capas no están en el snapshot: llegan como `rules` en el reporte, evaluadas
  contra `.codarch.yml` en el momento del diff. Ver
  [ADR 0011](../0011-0020/0011-reglas-de-arquitectura.md).

## Alternativas descartadas

- **Diff textual de `cc.json`.** Ruidoso, frágil y no entiende identidad ni ciclos.
- **Emparejar por ruta.** Un rename aparece como cambio de métricas en lugar de alta/baja, y dos
  ficheros con el mismo nombre en carpetas distintas se confunden.
- **Guardar el delta dentro del snapshot.** Rompe la inmutabilidad y obliga a regenerar el snapshot
  base.
- **Score de hotspot compuesto.** Difícil de explicar en un comentario de PR; mejor mostrar la
  métrica y el delta.
- **Ejecutar el análisis dos veces en el CLI.** `diff` consume artefactos ya generados.

## Hoja de ruta

Sin fases abiertas: M2 está cerrada.
