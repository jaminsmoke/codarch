---
title: "Las reglas de Biome y Ruff"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**Qué era**: Biome y Ruff ya medían sus hallazgos, pero el bloque de sistemas seguía diciendo que sus reglas no se enumeraban: se veían los mensajes y no lo que el proyecto exige.

**Qué cambia**: **Biome** lee de su config las reglas que escribe —`style.useConst: "error"` da `style/useConst`— con su grupo y su nivel; `off` no entra y las de `recommended` no se listan, porque dependen de la versión de Biome, y la nota del sistema lo dice. **Ruff** lee sus selectores de `[lint]` en `ruff.toml` y `[tool.ruff.lint]` en `pyproject.toml`: `select` y `extend-select`, menos los que apagan `ignore` y `extend-ignore`, y avisa de que son selectores —`E` agrupa decenas de reglas y `E501` es una—. Sin `select`, corren las de por defecto de Ruff y no se enumeran. Para leer el TOML hay un lector mínimo de la tabla y sus listas, con comentarios y varias líneas; nada de expandir prefijos con un catálogo propio.

**Por qué así**: enumerar lo que la config no escribe sería inventarlo. Los recomendados de Biome y los selectores de Ruff no se pueden convertir en una lista de reglas sin el catálogo de la versión que tenga el proyecto, así que se declaran tal cual y se explica el hueco, igual que con los sistemas sin lector.

**Verificado**: tests de las reglas de Biome con sus grupos, `off` y niveles en objeto; de los selectores de Ruff en `ruff.toml` y en `pyproject.toml`, con `ignore` y comentarios; y de las dos notas cuando no hay nada que enumerar. Además, una pasada real de `codarch lint` en los dos repos de prueba con su binario simulado: el artefacto sale con `2 reglas` en Biome y `3` en Ruff, con sus notas. Suite completa (1.257), lint, typecheck y build del sitio en verde.

**Lo que falta**: expandir los selectores de Ruff a reglas con el catálogo de su versión, las reglas de Checkstyle, y los lectores de Checkstyle, `go vet` y los analizadores de .NET.

**Veredicto**: fase en marcha.
