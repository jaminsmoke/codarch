---
title: "ADR 0037 — Los ciclos: de ejecución, no de tipos"
description: La regla sin-ciclos y el resto de la lente de dependencias cuentan hoy todas las aristas del grafo. Una arista se crea con cualquier import, también con import type y…
section: desarrollo
status: aceptado
date: "2026-10-23"
sidebar:
  label: "Los ciclos: de ejecución, no de tipos"
  order: 37
---

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

La regla `sin-ciclos` y el resto de la lente de dependencias cuentan hoy **todas** las aristas del
grafo. Una arista se crea con cualquier import, también con `import type` y `export type`, y el
snapshot solo dice cuántos de esos imports son `typeOnly`. La consecuencia es que un ciclo que
existe solo en tipos —el que se borra al compilar— se presenta como un ciclo de arquitectura.

La auditoría de este repositorio (2026-10-23) lo dejó a la vista: de los cinco ciclos, tres son de
producción y todos son de una vuelta y solo de tipos (`diff.ts ↔ symbol-diff.ts`,
`compare.ts ↔ diff.ts`, `config.ts ↔ profiles.ts`); los otros dos son fixtures intencionados. La
regla los señala a todos, y el mapa pinta como ciclos cosas que no se ejecutan.

Un `import type` no crea una dependencia de ejecución: TypeScript lo borra. Puede seguir siendo
una señal de acoplamiento —y por eso no queremos esconderlo—, pero no es lo mismo que un ciclo que
obliga a cargar dos módulos a la vez.

## Decisión

### 1. El grafo de ejecución decide los ciclos

Una arista cuenta para los ciclos si tiene al menos un import de ejecución: `weight > typeOnly`.
Las aristas que solo tienen imports de tipos (`weight === typeOnly`) se conservan en el snapshot y
en la lente de dependencias, pero no forman parte del grafo que detecta ciclos.

### 2. Lo que se deriva de cada grafo

| Dato | Grafo | Por qué |
|---|---|---|
| `cycles`, `isCyclic`, `inCycle`, `cycleSize` | ejecución | describen lo que se carga |
| `dependencyLevel` | ejecución | el nivel de una dependencia de ejecución |
| `fanIn`, `fanOut` | todos los imports | miden el acoplamiento, también el de tipos |
| `typeOnlyImports` | todos los imports | es la medida de lo que se borra al compilar |

`isCyclic` solo se marca en aristas de ejecución; una arista puramente de tipos no se pinta como
ciclo. Si una arista tiene las dos clases de import, cuenta por su parte de ejecución.

### 3. Un solo criterio en todas las capas

El parser (`buildGraph`), el diff y el reporte (`cycleGroups`, el input de las reglas y el resumen
de ciclos), el store del MCP y el modelo de la vista usan el mismo filtro. No vale que la regla
ignore un ciclo que el mapa sigue pintando: el snapshot, el PR y el agente tienen que contar lo
mismo.

### 4. Las aristas de tipos siguen visibles

La lente de dependencias no pierde información: cada arista conserva `weight` y `typeOnly`. Lo que
cambia es su lectura: una ida y vuelta solo de tipos se ve como dos imports de tipos, no como un
ciclo de ejecución. Una regla que quiera prohibirlos necesitará su propia decisión; no se esconde
en `sin-ciclos`.

### 5. El checksum cambia donde había ciclos de tipos

El formato `cc.json` 2.x no cambia: siguen las mismas aristas y los mismos campos. Cambia el valor
de las métricas derivadas de los ciclos y, con ellas, el checksum de los repositorios que tenían
un ciclo solo de tipos. Es un cambio de semántica del analizador, no de esquema; los artefactos se
regeneran y el resultado sigue siendo determinista.

## Consecuencias

- En este repositorio, los tres ciclos de producción dejan de violar `sin-ciclos`; los dos ciclos
  de fixtures siguen ahí hasta que se decida su exclusión (fuera de este ADR).
- El mapa deja de destacar ciclos que no se ejecutan; las aristas de tipos siguen en la lente.
- El PR, el reporte y el MCP dicen lo mismo que la regla.
- Los repositorios con ciclos de tipos ven cambiar su checksum una vez; después, el cálculo es
  estable.
- Los tests que construían un ciclo solo con `import type` pasan a comprobar que **no** es ciclo;
  hace falta un caso con un import de ejecución para seguir probando la detección.

## Alternativas descartadas

- **Contar todo y romper los ciclos de tipos en el código**: es correcto, pero obliga a mover tipos
  a módulos comunes y no distingue un acoplamiento de ejecución de uno que el compilador borra.
  Además, el problema volvería con el siguiente `import type`.
- **Cambiar solo la regla `sin-ciclos`**: el mapa, el diff y el MCP seguirían llamando ciclo a lo
  que la puerta ignora. Dos verdades para el mismo snapshot.
- **Ocultar las aristas de tipos**: se pierde la señal de acoplamiento y el usuario no puede ver
  por qué dos módulos se conocen.
- **Una regla nueva para ciclos de tipos ahora**: es una decisión de producto distinta; este ADR
  solo fija qué es un ciclo. Si hace falta, tendrá su propia regla y su propio ADR.

## Hoja de ruta

**Estado:** cerrado. No abre una fase: es un arreglo de semántica de una lente y una regla que ya
existen. Se aplica en M2 y M9.

- [x] **0037.1** `packages/parsers`: separar el grafo de ejecución del grafo de imports; ciclos,
  `isCyclic`, `inCycle`, `cycleSize` y `dependencyLevel` salen del primero; `fanIn`/`fanOut` siguen
  contando todos. Tests de ciclo runtime, ciclo type-only, arista mixta y self-loop.
- [x] **0037.2** `packages/metrics`: filtrar `cycleGroups` y el reporte de ciclos por
  `weight > typeOnly`; el input de `sin-ciclos` y el resumen del PR usan el mismo conjunto. Tests
  de base/head con un ciclo de tipos resuelto o introducido.
- [x] **0037.3** `apps/mcp` y `packages/render`: recalcular o pintar ciclos con el mismo criterio;
  el render deja de inferir un ciclo por la sola ida y vuelta de aristas. Tests de las consultas y
  del modelo de la vista.
- [x] **0037.4** Snapshot y checksum: comprobar que el formato no cambia y que el checksum es
  determinista; regenerar el snapshot de la auditoría.
- [x] **0037.5** `docs/model.md` y `docs/rules.md`: decir que los ciclos son de ejecución y que las
  aristas de tipos siguen visibles. Pasar la suite completa y `check:action`.
