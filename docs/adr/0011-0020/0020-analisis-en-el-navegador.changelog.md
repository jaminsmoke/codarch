# Changelog — ADR 0020 «Análisis en el navegador con la misma gramática que el CLI»

**Decisión:** [el ADR](0020-analisis-en-el-navegador.md) · **Estado:** aceptado · **Fecha:** 2026-10-21

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el [ADR](0020-analisis-en-el-navegador.md#hoja-de-ruta).

## Lo que se hizo

### M6 — Análisis en el navegador

**Estado:** cerrado. El navegador analiza una carpeta con la misma gramática y el mismo código que el CLI, y el snapshot que sale tiene su checksum.

- [x] Parser TS/JS en el navegador (tree-sitter WASM con la gramática del propio paquete
  `tree-sitter-typescript`); decisión en [ADR 0020](0020-analisis-en-el-navegador.md).
- [x] Mismas métricas y mismo checksum que el CLI: medición compartida y test de paridad.
- [x] Puerto de sistema de ficheros y núcleo del análisis sin `node:fs` ni git; el snapshot del
  fichero en memoria tiene el mismo checksum que el del CLI.
- [x] Worker con las gramáticas y el núcleo del CLI: el análisis no bloquea la interfaz.
- [x] Hash en JavaScript puro (`@noble/hashes`) para que el navegador calcule ids y checksum igual
  que el CLI.
- [x] Lector de carpetas con File System Access API y botón **Analizar carpeta aquí…** en la app.
- [x] Progreso fino por fichero y cancelación: el botón **Cancelar** corta el análisis al momento
  (terminar el worker), y se puede cortar también la lectura de ficheros.
- [x] Churn y git fuera del navegador; el snapshot sale sin historial, como el del CLI con
  `--no-git`.

## Decisiones relacionadas

- [ADR 0003 «TypeScript primero, Rust cuando un benchmark lo exija»](../0001-0010/0003-typescript-first.md) — M1, M6
