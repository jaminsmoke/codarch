# Hoja de ruta — ADR 0005 «2D primero, 3D como lente»

**Decisión:** [el ADR](0005-2d-first.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-20

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/contenido.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M0 — Modelo y mapa, sin parsers

**Objetivo:** validar el modelo de datos y el render 2D sin escribir un solo parser.

Entrada: un `cc.json` real de CodeCharta (el de su propia `visualization/`).

```
$ codarch render codecharta.cc.json -o map.html
```

Criterios de aceptación:

- [x] Importa `cc.json` 2.x validando la estructura (ids, métricas, aristas).
- [x] Importa `cc.json` 1.x mediante un normalizador a 2.x (desnudo y `{ checksum, data }`).
- [x] Treemap 2D: área = `rloc`, color = métrica elegible, altura/borde = jerarquía.
- [x] Hover con métricas, búsqueda, clic para enfocar una carpeta.
- [x] HTML único, sin servidor, sin red: 489.663 bytes con la muestra real de 2.003 ficheros.
- [x] 5k nodos renderizados en < 500 ms (mediana ~27 ms con `npm run bench:render`).
- [x] Salida determinista: mismo input, mismo HTML (salvo hash de build).
- [x] Comparación visual lado a lado con el mapa de CodeCharta del mismo commit.

**Por qué primero:** elimina el riesgo del modelo y del render antes de invertir en parsers. Y nos
obliga a mirar los datos del rival con nuestros propios ojos.

## Decisiones relacionadas

- [ADR 0001 «Clean-room, con `cc.json` como frontera»](0001-clean-room-con-ccjson.md) — M0
- [ADR 0002 «Monorepo core-first»](0002-monorepo-core-first.md) — M0, M1
- [ADR 0006 «Nodos = ficheros, preparados para símbolos»](0006-nodos-fichero.md) — M0
- [ADR 0007 «El nombre: CodArch»](0007-nombre-codarch.md) — M0
- [ADR 0008 «Diseño del mapa 2D»](0008-diseno-mapa-2d.md) — M0, M5, M5.1

## Dónde se aplica

- M5 (App web): [la hoja de su decisión](0008-diseno-mapa-2d.roadmap.md)
