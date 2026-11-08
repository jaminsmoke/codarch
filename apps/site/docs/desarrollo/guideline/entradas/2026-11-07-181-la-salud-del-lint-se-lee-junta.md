---
title: "La salud del lint se lee junta"
date: "2026-11-07"
category: "fix"
verdict: "adr"
---

**Qué era**: la ficha de Código leía solo `lint.repmod.json`. Un legado 1.2 vacío salía con cobertura desconocida, y los hallazgos de documentos acababan en Docs y config, junto al catálogo.

**Qué cambia**: `scopeHealthMerged` junta los dos artefactos por ruta canónica ([ADR 0109](/desarrollo/adr/0101-0110/0109-la-salud-del-lint-se-lee-junta/)). Cada hallazgo guarda dominio, herramienta y regla; si la herramienta se infiere, se dice. En la raíz no se recortan los documentos con las rutas del código. Un legado lleva el motivo `legacy-version` y no pasa a cobertura completa. El catálogo deriva `countState`: oxlint sin enumerar es `unknown`, no cero. Las reglas de `codarch` salen del productor, no de los mensajes. El riesgo no cambia.

**Por qué así**: sumar en cada panel duplica la cuenta, y un solo `meta.tree` no puede firmar los dos árboles.

**Qué falta**: la ficha de código no abre un `.md`, porque ese nodo está en el mapa del resto. El ancla del hallazgo dice cuál.

**Tamaño**: el adaptador está en `@codarch/lint`; la ficha solo lo llama.

**Veredicto**: hecho.
