---
title: "M76 cierra con Reglas en las hojas"
date: "2026-11-02"
category: "feature"
verdict: "fase"
---

**Qué era**: las reglas del resto ya medían en la pasada y escribían
`.codarch/lint-rest.repmod.json`, pero el mapa del resto seguía sin enseñarlas: sin
sección **Reglas**, sin punto en la barra y sin que `.codarch.yml` pudiera declarar
entradas, gemelas, frontmatter ni severidades. La línea del enlace seguía abierta.

**Qué cambia**: el bloque `docs:` de `.codarch.yml` se lee, se valida y alimenta
`buildRestLint`. Web, CLI `serve` y escritorio cargan `lint-rest.repmod.json` por el
mismo camino que el lint del código. Las hojas de documento, carpeta y proyecto del
resto muestran **Reglas** (no Lint) y el punto de la barra marca la peor severidad
del ámbito —sin punto si está limpio o sin medir—. La línea del enlace queda **fuera
de v1**: el snapshot guarda aristas, no la línea, y fingirla mentiría. M76 cierra.

**Por qué así**: un solo vocabulario (regla, severidad, mensaje) y un artefacto por
árbol. El mapa del código no carga este; el riesgo del código no lo pesa. La
configuración declara lo que no se puede adivinar —entradas, gemelas, esquemas de
frontmatter— en el mismo alcance del análisis.

**Verificado**: typecheck, lint, `check:action` y vitest (1632); tests del bloque
`docs:`, de `serve` (`/data/lint-rest.repmod.json`), de la persistencia del
escritorio y de `lintBarMark` con etiqueta de reglas.

**Veredicto**: hecho. M76 cierra. La línea del enlace se reabre solo si el resto
guarda la lente `rest.links`.
