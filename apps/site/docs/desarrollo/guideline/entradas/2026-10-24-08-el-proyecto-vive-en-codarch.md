---
title: El proyecto vive en .codarch
date: "2026-10-24"
category: feature
verdict: fase
---

**Qué es**: que el escritorio lea el proyecto de `.codarch/` del repo y no de `localStorage`.
`localStorage` se queda con las preferencias de vista, los plugins activos y la raíz del último
repo; el snapshot, el reporte y los addons salen del repositorio.

**Por qué**: aunque el proceso principal ya escribía `.codarch/snapshot.cc.json`, el renderer
seguía guardando el proyecto en `localStorage` (`codarch.project.v1`) y lo restauraba de ahí. De
poco servía escribir en el repo si al arrancar se leía la copia local: un proyecto por máquina y
la web sin poder reutilizar el análisis.

**Qué cambió**: al arrancar, el escritorio migra una vez el proyecto viejo a `.codarch/` (si el
repo sigue ahí y se puede escribir), olvida la clave antigua y restaura desde el repo: el
snapshot, su `report.json` si existe y los addons que declara. «Analizar carpeta» vuelve a
escribir el snapshot, y abrir un JSON suelto no inventa un `.codarch/` a su lado. En los ajustes,
**Proyecto** explica que vive en el repo y olvidarlo no borra el directorio.

**Veredicto**: **fase M32, cerrada**, en la hoja de ruta de
[ADR 0048](../../adr/0041-0050/0048-el-escritorio-persiste-en-codarch.md).
