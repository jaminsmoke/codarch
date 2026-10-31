---
title: "El agente ya puede leer el lint"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**Qué era**: el lint vivía en el mapa, en el comentario del PR y en Reglas, pero el MCP no lo exponía. Un agente podía saber que un fichero tenía deuda de lint por las métricas, no qué sistema la produce, con qué regla y en qué línea.

**Qué cambia**: `get_lint_report` lee el `.codarch/lint.cc.json` que dejan `codarch lint` y `serve`, al lado del snapshot, y devuelve los `systems` del proyecto —nombre, configuración, reglas activas con su severidad y la nota de lo que no se pudo medir o enumerar—, las `tools` que midieron, el `summary`, los `files` y el `total` del ámbito, las `rules` con su cuenta y los `findings` con fichero, regla, severidad, línea, columna y mensaje. Los errores van primero y luego por ruta y línea; `limit` recorta la lista sin tocar `total`. Filtra por `path` (carpeta o fichero, validado contra el snapshot), por `rule` y por `severity`. Sin artefacto no contesta «limpio»: `available: false` con el motivo, porque sin medir no es sin hallazgos. También lee el nombre anterior, `lint.json`.

**Por qué así**: el MCP no mide, cuenta lo medido, igual que con el resto del modelo (ADR 0013, ADR 0074). Por eso no lanza herramientas ni expande reglas: si el artefacto no está, la respuesta honesta es que falta, no una lista plausible. Y una sola herramienta, no una por pregunta: el agente pide el lint de una carpeta y recibe sistemas, reglas y mensajes en la misma respuesta.

**Verificado**: tests de la herramienta con un artefacto real de `createLintArtifact` —sistemas con sus reglas y su nota, orden de hallazgos y de reglas, filtros por carpeta, fichero, regla y severidad, recorte con `total` intacto, lectura de `lint.json` y `available: false` sin artefacto— y del registro en el servidor: catorce herramientas. Una llamada por stdio contra un repo temporal con `analyze` y `lint` reales (Ruff simulado en el PATH) devolvió los dos sistemas y sus hallazgos. Suite de `apps/mcp` en verde, lint, typecheck y build del sitio.

**Veredicto**: fase en marcha.
