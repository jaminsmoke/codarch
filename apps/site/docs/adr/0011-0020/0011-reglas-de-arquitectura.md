---
title: ADR 0011 — Reglas de arquitectura en `.codarch.yml`
description: "El diff ya responde a qué cambió. Falta responder a si el cambio rompe una decisión de arquitectura. Esa política no pertenece al snapshot: el mismo commit debe poder…"
section: adr
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: Reglas de arquitectura en .codarch.yml
  order: 11
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

El diff ya responde a **qué cambió**. Falta responder a **si el cambio rompe una decisión de
arquitectura**. Esa política no pertenece al snapshot: el mismo commit debe poder evaluarse contra
la política del repositorio y contra una política más estricta en una release.

## Decisión

1. **Configuración en `.codarch.yml`**, junto al código. `codarch diff` la carga por defecto si
   existe; `--config <file>` permite otra y `--no-config` la desactiva. `analyze` no la lee.
2. **Tres tipos de regla en M2:** `forbidden` (una capa no puede depender de otra), `threshold`
   (métrica por fichero fuera de rango) y `cycles` (componentes cíclicos). No hay DSL ni plugins.
3. **Capas por glob, primera coincidencia.** Cada capa tiene `patterns` (o `paths`) relativos al
   root. Si un fichero coincide con varias, gana la primera capa declarada; si no coincide con
   ninguna, no tiene capa y no participa en reglas de capas.
4. **Severidad explícita, por defecto `error`.** `info`, `warn` y `error` solo cambian la política:
   el reporte muestra todas, pero `--fail-on violations` solo bloquea las introducidas con
   severidad `error`. Así conviven una política de aviso y una de bloqueo sin duplicar reglas.
5. **Solo lo introducido bloquea.** Se evalúan base y head; una violación con la misma clave en
   ambos lados es deuda existente. `introduced`, `existing` y `resolved` se publican por separado.
   La clave es estable: regla + arista, regla + fichero, o regla + conjunto de ids del ciclo.
6. **Umbral por fichero, no por carpeta.** Un fichero nuevo que nace por encima del máximo es una
   violación introducida; un fichero que ya estaba por encima no bloquea por el simple hecho de
   seguir ahí.
7. **Sin hallazgos inventados.** Si una métrica no existe, el umbral no se evalúa. Si un import no
   resuelve, no se crea una arista. Si no hay configuración, `rules.configured` es `false` y el
   reporte no contiene violaciones.
8. **El reporte sigue siendo determinista.** Violaciones ordenadas por clave, sin timestamps. La
   configuración no se copia al snapshot.

## Consecuencias

- La misma pareja de snapshots puede evaluarse contra dos configuraciones y compararse.
- El bot de PR puede publicar avisos sin bloquear, y reservar `error` para lo que el equipo decidió
  que es innegociable.
- Las reglas de capas solo ven aristas internas resueltas; no opinan sobre imports externos.
- No hay supresiones por línea ni baseline separado: la deuda existente se reconoce por comparación
  con base. Si se necesita un `ignore` explícito, se añadirá con una clave y una justificación.
- El parser YAML es estricto con la forma, pero tolera claves desconocidas para no romper
  configuraciones futuras.
- `threshold` no agrega por carpeta ni por capa todavía; eso requiere decidir el nivel de
  agregación y llegará con una lente propia.

## Alternativas descartadas

- **Reglas dentro del snapshot.** Rompe la separación entre “cómo es” y “cómo debería ser”, y obliga
  a regenerar snapshots al cambiar la política.
- **Solo aristas prohibidas.** No cubre complejidad ni ciclos, que son la mitad de la cuña.
- **Bloquear cualquier violación, incluidas las existentes.** Un repo con deuda previa no podría
  mergear nunca; el PR debe pagar solo lo que añade.
- **Un lenguaje de consultas propio.** Demasiado pronto; tres tipos de regla cubren el caso real y
  se pueden explicar en un comentario de PR.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M2 y M9.
