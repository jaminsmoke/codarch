---
title: "Las cuentas y las rutas del lint salen de los mensajes"
date: "2026-11-06"
category: "fix"
verdict: "adr"
---

**Qué era**: el lector devolvía las cuentas declaradas del artefacto, aunque no
cuadraran con los mensajes, y conservaba la clave de cada fichero tal cual
venía. `./src/a.ts` o una ruta en NFD no caía en el fichero del mapa.
`summary.measured` se leía como una cuenta más, sin decir que es la cobertura
global de la pasada.

**Qué cambia**: el esquema sigue en **1.2** ([ADR 0106](/desarrollo/adr/0101-0110/0106-las-cuentas-y-las-rutas-del-lint/)).
Al leer, `errors`, `warnings` y el `summary` heredado se regeneran desde los
mensajes. `summary.files` son los ficheros con hallazgos. `summary.measured` se
conserva y no se recalcula. Las rutas pasan por `canonicalLintPath`: NFC por
segmento, `/`, sin `./` ni `..`, y sin cambiar mayúsculas. Si dos claves
distintas caen en la misma ruta, `diagnostics` lo avisa y los mensajes se
conservan. El live anuncia `lintTotals`. Los nombres siguen siendo
`lint.repmod.json` y `lint-rest.repmod.json`.

**Por qué así**: las hojas ya contaban mensajes; el lector no. Subir el esquema
o fundir las claves en silencio habría escondido el dato o roto lo ya escrito.

**Verificado**: deriva 9/9 frente a un aviso, `info`, idempotencia de la
lectura, ida y vuelta de 1.0 y 1.1, NFD frente a NFC, barras, `./`, `//`,
rechazo de `..`, mayúsculas, colisión, y que el render y el MCP ven la ruta
canónica.

**Veredicto**: hecho. Sin fase nueva.
