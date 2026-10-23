---
title: "ADR 0025 — La lente de símbolos: mirar dentro del fichero"
description: "El modelo de CodArch tiene tres escalas (ADR 0006): la estructura de directorios, los ficheros y los símbolos. La v1 solo mide las dos primeras. El resultado es que un…"
section: adr
status: aceptado ✅
date: "2026-10-21"
sidebar:
  label: "La lente de símbolos: mirar dentro del fichero"
  order: 25
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-21

## Contexto

El modelo de CodArch tiene tres escalas (ADR 0006): la estructura de directorios, los ficheros y los
símbolos. La v1 solo mide las dos primeras. El resultado es que un directorio con veinte ficheros
pequeños y otro con un fichero enorme se ven igual en el mapa, y que la pregunta "¿qué parte de este
módulo es la que se complica?" no tiene respuesta.

El contrato del parser ya deja preparados los símbolos (`ParsedSymbol`, opcional) para no cerrarle la puerta a
esto. Ahora toca abrirla.

La pregunta de alcance es **qué** se mide y **dónde** se ve:

- **Por fichero** (una métrica más): "este fichero tiene 12 funciones, la más compleja tiene
  complejidad 55". Es barato: el AST ya se recorre para medir.
- **Como objeto del diff** (qué función ha cambiado): "has reescrito `parseDiff`". Es lo que de verdad
  interesa, pero es un grafo de símbolos y un diff distinto: bastante más caro y con decisiones de
  modelo (¿qué pasa con una función renombrada? ¿y con una movida de fichero?).

## Decisión

**M11 es la lente de símbolos por fichero.** Los símbolos se miden y se guardan; el diff de símbolos
es un paso aparte, detrás.

1. **El parser recoge los símbolos.** Funciones, clases, interfaces, tipos y enums, con su línea y,
   las funciones, su complejidad ciclomática y su longitud. El código es **compartido** con el
   parser del navegador (el mismo `collectSymbols`), así que el checksum del snapshot no cambia: la
   paridad navegador/CLI sigue valiendo ✓ (ADR 0020).

2. **Solo los símbolos con forma.** No se listan las constantes: son datos, no estructura, y una lista
   de treinta `const` esconde la función que de verdad importa. Una `const` que guarda una función sí
   se lista, como la función que es ✓.

3. **Una lente nueva, `symbols`.** El modelo ya lo permite: `CcLenses` acepta lentes desconocidas
   (`[name: string]: unknown`), de modo que un lector viejo ignora la nueva sin romperse ✓. El
   `apiVersion` no cambia: añadir una lente opcional no invalida el formato ✓ (como pasó con la
   lente de migración).

4. **Los símbolos no son el objeto del diff todavía.** El diff sigue siendo de ficheros. El diff de
   símbolos es M12 y necesita su propia decisión (firma, renombrados, funciones movidas).

5. **Dónde se ve.** El inspector de las dos apps lista los símbolos del fichero, la función más
   compleja primero; el MCP responde a "¿qué funciones tiene este módulo?" y a "¿cuál es la función
   más compleja del repo?".

## Consecuencias

- El snapshot crece. Medido en este repo: 852 símbolos en 170 ficheros. Los datos son 59 KB, pero el snapshot se escribe con sangría (para que los diffs en git se lean ✓), así que el fichero pasa de 230 KB a 370 KB (+60%) ✓. Es un coste acotado y con información que antes no existía ✓.
- Un `apiVersion` intacto significa que las herramientas viejas siguen leyendo los snapshots
  nuevos ✓, pero no ven los símbolos: es el mismo trato que la lente de migración ✓.
- La complejidad por función ya se medía por fichero (`maxComplexity`); ahora se sabe **qué
  función** la tiene ✓. Eso convierte una métrica en una pista accionable.
- Con esto, el diff de símbolos (M12) tiene datos de partida ✓, pero también una decisión pendiente:
  cómo se compara una función que cambió de nombre o de fichero ✓.

## Alternativas descartadas

- **Meter los símbolos en la lente de métricas.** Descartado: las métricas son atributos numéricos
  por fichero; una lista de símbolos no encaja ahí ✓. Como lista sería un valor dentro de un
  atributo, ilegible para cualquier lector ✓.
- **Un grafo de símbolos aparte** (nodos = funciones, aristas = llamadas). Descartado por ahora: es
  otro modelo entero, con su checksum y su render ✓. Se puede añadir más adelante **encima** de la
  lente de símbolos ✓, sin romper esto ✓.
- **Medir los símbolos solo en el CLI**. Descartado: la web tiene que ver lo mismo que el CLI, y el
  checksum igual (ADR 0020) ✓.
- **Emitir las constantes también**. Descartado: ruido ✓. La estructura es lo que interesa ✓.

## Hoja de ruta

Sin fases abiertas: M11 está cerrada.

El detalle de lo hecho está en el [changelog](0025-lente-de-simbolos.changelog.md).

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
