---
title: ADR 0020 — Análisis en el navegador con la misma gramática que el CLI
description: "M6 pide analizar un repositorio desde el navegador. La condición es dura: el snapshot del navegador tiene que tener el mismo modelo, las mismas métricas y el mismo…"
section: adr
status: aceptado ✅
date: "2026-10-21"
sidebar:
  label: Análisis en el navegador con la misma gramática que el CLI
  order: 20
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-21

## Contexto

M6 pide analizar un repositorio desde el navegador. La condición es dura: el snapshot del navegador
tiene que tener **el mismo modelo, las mismas métricas y el mismo checksum** que el del CLI. Si no,
el producto abre dos verdades: un `report.json` generado por el CI no casaría con el mapa que ve el
equipo en el navegador, y el diff entre snapshots dejaría de significar nada.

El punto de partida era ADR 0003: el núcleo expone puertos (`FileSystem`, `Parser`) y nada de `fs`
dentro del modelo. El parser ya era un puerto (`SourceParser`); faltaba una implementación que
corra en el navegador.

## La búsqueda del parser

Se compararon tres caminos, con measurements sobre el propio repo (132 ficheros):

1. **tree-sitter WASM de otra versión.** El paquete `tree-sitter-wasms` publica gramáticas
   compiladas a WASM, pero de `tree-sitter-typescript@0.20.5`, tres versiones por detrás de la
   `0.23.2` que usa el CLI, y sin gramática TSX. Medido: **26 de 135 ficheros con métricas
   distintas** (19 %). Descartado: dos verdades garantizadas.
2. **El compilador de TypeScript como parser.** Es JavaScript puro y funciona en el navegador, pero
   medido: **68 de 131 ficheros con métricas distintas** (48 %) y 19 ms por fichero frente a ~1 ms
   de tree-sitter. Descartado por los dos motivos.
3. **Compilar la gramática a WASM en local.** Requiere emscripten, docker o clang con wasm-ld:
   ninguno está disponible, y meter emscripten en el build del repo sería una carga enorme para
   producir un binario.

## El hallazgo

El paquete `tree-sitter-typescript@0.23.2` **publica sus propios `.wasm`**: `tree-sitter-typescript.wasm`
y `tree-sitter-tsx.wasm`, con el mismo hash que los assets del release v0.23.2 en GitHub. Son la
misma gramática que el binding nativo, con las dos variantes (TS y TSX) que el CLI ya usa.

Con esas gramáticas, los dos bindings dan **126 de 126 ficheros con métricas idénticas**, con una
salvedad: los bindings no coinciden en cómo tipan un comentario.

## La salvedad: comentarios dentro de un `interface`

Dentro de un `interface`, el binding **nativo** tipa el comentario como `interface_body` (un nodo
invisible que hereda el tipo de su padre) y el **WASM** lo tipa como `comment`. La consecuencia es
que el nativo contaba el comentario como línea de código y el WASM no.

La regla de detección de comentarios no puede ser el tipo de nodo: tiene que ser **el texto**. Con
la regla por texto los dos builds cuentan las mismas líneas.

Eso arregla además un bug del CLI: un `/** ... */` dentro de un `interface` se contaba como código.
Medido sobre este repo: **23 de 132 ficheros cambian, 103 líneas en total**. El `rloc` del CLI baja
un poco y el checksum de los snapshots cambia; es el precio de que el navegador dé el mismo número.

## Decisión

1. **El cálculo de métricas se extrae a un módulo compartido** (`packages/parsers/src/ts/measure.ts`)
   que trabaja con un `SyntaxNodeLike`: el subconjunto de la API de tree-sitter que ambos bindings
   exponen igual. Nativo y WASM ejecutan **el mismo código** para medir.
2. **El parser WASM usa las gramáticas del propio paquete `tree-sitter-typescript`**, la misma
   versión que el binding nativo. Vive en una entrada aparte (`@codarch/parsers/browser`) para que
   el bundle del CLI no cargue `web-tree-sitter`.
3. **Los comentarios se detectan por texto**, no por tipo de nodo. Es la regla que hace que nativo y
   WASM coincidan.
4. **Un test de paridad** compara ambos parsers sobre las fixtures y exige métricas e
   importaciones idénticas. Es la red de seguridad: si divergen, el checksum del navegador será
   distinto y el test lo dice antes de que llegue a un usuario.
5. **El checksum del navegador will be el del CLI con `--no-git`.** El navegador no tiene historial,
   así que su snapshot no lleva churn; comparar un snapshot de navegador con uno de CI solo es
   legítimo si ambos se generaron sin historial.

## Consecuencias

- El navegador puede medir lo mismo que el CLI, con la misma gramática y el mismo código de
  medición.
- El CLI cambia de `rloc` en los ficheros con comentarios dentro de interfaces. Los snapshots
  existentes dejan de ser comparables con los nuevos: es intencionado, y el test de paridad lo
  fija.
- El runtime WASM y las dos gramáticas son ~3 MB que se cargan bajo demanda, solo cuando se pide
  analizar en el navegador.
- Sigue pendiente el sistema de ficheros virtual y el walker en el navegador: sin ellos el parser
  WASM todavía no tiene de dónde leer.

## Alternativas descartadas

- **Gramática WASM de otra versión.** Más rápida de conseguir y no sirve: las métricas no casan.
- **Compilador de TypeScript.** Sin WASM, pero más lento y con otras métricas.
- **Que el navegador use el compilador y el CLI también.** Habría un solo parser, pero el CLI
  perdería la velocidad de tree-sitter y cambiaría todas las métricas del producto.
- **Analizar en el navegador sin garantía de paridad.** El roadmap lo pide explícitamente: no abrir
  dos verdades.

## Hoja de ruta

Sin fases abiertas: M6 está cerrada.

El detalle de lo hecho está en el [changelog](0020-analisis-en-el-navegador.changelog.md).
