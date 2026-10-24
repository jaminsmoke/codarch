---
title: El escritorio persiste en .codarch
date: "2026-10-24"
category: feature
verdict: fase
---

**Qué es**: que el escritorio deje de guardar el proyecto en `localStorage` y escriba
`.codarch/snapshot.cc.json` en el repo analizado, como la web y el CLI. Así cada repo tiene su
propio `.codarch/` y la configuración queda por repo, no en la instalación de CodArch.

**Por qué**: hoy el escritorio analiza en memoria y guarda el resultado en `localStorage`
(`codarch.project.v1`): un solo proyecto por máquina. Al cambiar de repo se pierde el anterior, y la
web app («Abrir repositorio») y el CLI no pueden reutilizar el análisis del escritorio.

**Decisión**: [ADR 0048](../../adr/0041-0050/0048-el-escritorio-persiste-en-codarch.md). El
proceso principal escribe el snapshot en `.codarch/` y asegura que esté en `.gitignore`. Al abrir
una carpeta con `.codarch/snapshot.cc.json`, se carga sin re-analizar. `localStorage` queda solo
para preferencias de ventana.

**Ventajas**: un proyecto por repo, sin pérdida al cambiar; consistencia entre CLI, web y
escritorio; menos re-análisis; configuración completa per-repo.

**Veredicto**: **fase M32**, en la hoja de ruta de [ADR 0048](../../adr/0041-0050/0048-el-escritorio-persiste-en-codarch.md).
