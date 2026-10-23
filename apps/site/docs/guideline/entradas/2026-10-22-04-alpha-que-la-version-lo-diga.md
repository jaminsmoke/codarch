---
title: "Alpha: que la versión lo diga"
date: "2026-10-22"
category: chore
verdict: fase
---

**Qué es**: que el producto diga que es alpha. La funcionalidad está; el producto todavía
no: aún se le cambian las cosas y la app de escritorio es una copia de la web.

**Decisión**: [ADR 0032](../../adr/0031-0040/0032-las-versiones-y-las-actualizaciones.md)
(§6). La versión lleva prerelease (`0.3.0-alpha.1`), en npm va a la etiqueta `next` para
que `latest` se quede con la última normal, y el README lo dice arriba.

Lo que **sí** se promete: el modelo `cc.json` 2.x y su checksum.

**Veredicto**: **fase M21**, en la hoja de
[ADR 0032](../../adr/0031-0040/0032-las-versiones-y-las-actualizaciones.md). Hecho.
