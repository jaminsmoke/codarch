---
title: El estado vive en el repositorio
date: "2026-10-24"
category: feature
verdict: fase
---

**Qué es**: ordenar los tres sitios donde CodArch guarda algo de un repositorio —`.codarch.yml`,
`.codarch/` y `.codarch-history/`— y hacer que el estado se ignore en git desde el primer análisis,
también desde el CLI.

**Por qué**: el escritorio ya escribía `.codarch/` en el repo y lo añadía al `.gitignore`, pero el
CLI (`codarch analyze`) dejaba esos ficheros sin ignorar, y el escritorio volvía a añadir la línea en
cada guardado, así que quitarla no servía. Además no estaba escrito qué pasa al analizar una
subcarpeta de un repo que ya tiene `.codarch/`, ni cómo se mantiene el mapa al día.

**Qué cambió**: `ensureGitignoreEntry` en `@codarch/parsers` lo usan el CLI y el escritorio, solo
cuando `.codarch/` nace; `--out` no toca el `.gitignore` y `serve` no escribe. La regla de anclaje
queda escrita: cada carpeta analizada tiene su estado. Y el mapa deja de ser una foto: M34 seguirá
con la vigilancia de la raíz y el refresco en segundo plano.

**Veredicto**: **fase M34**, en la hoja de ruta de
[ADR 0050](../../adr/0041-0050/0050-el-repositorio-guarda-su-estado.md).
