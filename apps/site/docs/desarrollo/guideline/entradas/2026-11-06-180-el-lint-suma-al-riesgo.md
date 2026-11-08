---
title: "El lint suma al riesgo"
date: "2026-11-06"
category: "feature"
verdict: "adr"
---

**Qué era**: con artefacto, el riesgo reescalaba la base para dejar un 20 % al lint. Un fichero sin hallazgos bajaba, y uno que no estaba en `files` se rellenaba con cero.

**Qué cambia**: el lint suma antes de gamma y no resta ([ADR 0108](/desarrollo/adr/0101-0110/0108-el-lint-suma-al-riesgo/)). `D` es errores más un cuarto de avisos, se satura en 10 y puede aportar hasta 0,2. `risk` sigue en 0..1 y `score` es 100 veces eso. La vista sale de `scopeHealth` de cada fichero. `fresh` null o false no penaliza. La fórmula está en [el riesgo](/desarrollo/riesgo/).

**Por qué así**: reescalar hacía que un cero de lint bajara ficheros que no se podían llamar limpios. La deuda vista, aunque el universo sea desconocido, sí sube el índice: es un mínimo observado.

**Qué falta**: la fila de contribuciones en la ficha. α y Dsat siguen sin calibrar.

**Tamaño**: la fórmula ya estaba en metrics; aquí se cablea el render, el MCP y la captura, con su ADR.

**Veredicto**: hecho, salvo la ficha.
