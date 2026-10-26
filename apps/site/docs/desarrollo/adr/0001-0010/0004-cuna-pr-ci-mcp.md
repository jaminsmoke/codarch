---
title: "ADR 0004 — La cuña: PR/CI + MCP"
description: '"Un visualizador mejor que CodeCharta" es una carrera contra nueve años de ventaja. Y el formato visual —ciudad 3D— es el mejor escaparate y la peor herramienta diaria:…'
section: desarrollo
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: "La cuña: PR/CI + MCP"
  order: 4
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

"Un visualizador mejor que CodeCharta" es una carrera contra nueve años de ventaja. Y el formato
visual —ciudad 3D— es el mejor escaparate y la peor herramienta diaria: oclusión, orientación, curva
de aprendizaje, y no cabe en un pull request.

El hueco no está en cómo se dibuja el mapa, sino en **cuándo y dónde aparece**.

## Decisión

El producto se define por dos puntos de contacto, no por la UI:

1. **Ciclo de PR/CI.** El análisis produce un diff arquitectónico accionable: ciclos nuevos, capas
   violadas, deriva de acoplamiento y hotspots que se mueven. Se publica como comentario y como
   artefacto, con umbrales opcionales que bloquean el merge.
2. **MCP.** El mismo modelo, expuesto como herramientas para agentes:
   `get_architecture_map`, `find_hotspots`, `check_change_impact`, `list_violations`,
   `explain_module`.

La UI web es un consumidor del modelo, no el producto.

## Consecuencias

- Todo debe ser **headless, determinista y rápido**. Un comentario de PR no admite "abre la app".
- El reporte debe ser **machine-readable** (`report.json`) además de legible.
- La salida por consola y el comentario comparten redacción: mismo mensaje, distinto soporte.
- La web hereda la presión de rendimiento del CI, lo cual es bueno.
- Riesgo: sin UI atractiva, la herramienta es difícil de vender. Mitigación: el mapa estático
  embebible es el escaparate.

## Alternativas descartadas

- **Visualizador superior como cuña.** Compite de frente y no aprovecha ninguna ventaja estructural.
- **Exploración AI-native como cuña principal.** Es un multiplicador, no un producto: sin un modelo
  sólido, el agente solo alucina sobre el código.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M2 y M3.
