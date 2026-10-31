---
title: "Biome y Ruff entran en el lint"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**Qué era**: Biome y Ruff se detectaban por su configuración, y ahí se acababa: sus sistemas entraban en el artefacto con un «aún no tiene lector» y sus hallazgos no contaban ni en el riesgo ni en la ficha.

**Qué cambia**: el artefacto sabe leer `biome lint --reporter=json` y `ruff check --output-format=json`, y el `format` del override gana `biome-json` y `ruff-json`. Biome corre con su binario de `node_modules` (`@biomejs/biome/bin/biome`); Ruff, que no vive ahí, con el que tenga el proyecto en el PATH. Biome no da línea ni columna —su `span` son desplazamientos de bytes—, así que sus mensajes entran sin posición en vez de calcularla a mano, y su regla conserva el grupo (`suspicious/noDoubleEquals`). Ruff no da severidad: sus hallazgos cuentan como error, que es como los trata al salir con código distinto de cero. Las reglas activas de los dos siguen sin enumerarse, y el artefacto lo dice. Sus mensajes se funden con los de ESLint y oxlint, se ordenan y se cuentan igual.

**Por qué así**: se mide lo que la herramienta dice y se declara lo que no dice. Un `span` de bytes convertido a línea con una heurística o una severidad inventada para Ruff serían peores que un hueco: el mapa contaría una deuda que la herramienta no afirmó.

**Verificado**: tests de los dos normalizadores —prefijo, severidades, rutas absolutas, agrupación por fichero y el rechazo de un JSON que no es suyo—, del despacho por dialecto en `runLint` y de la detección con y sin binario. Además, una pasada real de `codarch lint` en dos repos de prueba con un binario de cada herramienta (ninguna de las dos está instalada aquí): detecta, ejecuta, normaliza y escribe `lint.cc.json` con sus hallazgos. Suite completa (1.250), lint, typecheck y build del sitio en verde.

**Lo que falta**: las reglas activas de Biome y Ruff desde su configuración, y los lectores de Checkstyle, `go vet` y los analizadores de .NET.

**Veredicto**: fase en marcha.
