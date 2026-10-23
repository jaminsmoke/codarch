---
title: ADR 0040 — La complejidad cuenta el cuerpo entero
description: La auditoría de este repositorio (2026-10-23) dejó a la vista que el mapa y la lente de símbolos no dan las mismas cifras de complejidad. En la foto de audit-0038, 45 de…
section: adr
status: aceptado
date: "2026-10-23"
sidebar:
  label: La complejidad cuenta el cuerpo entero
  order: 40
---

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

La auditoría de este repositorio (2026-10-23) dejó a la vista que el mapa y la lente de símbolos no
dan las mismas cifras de complejidad. En la foto de `audit-0038`, 45 de 211 ficheros tienen un
`maxComplexity` mayor que la complejidad máxima de sus símbolos con nombre, y 135 de 211 tienen más
`functions` que funciones en la lente de símbolos.

Eso **no** es un error de suma. `measureSource` mide todas las funciones implementadas, incluidas las
anónimas y las anidadas; `collectSymbols` lista solo las declaraciones con nombre. Son dos preguntas
distintas: «¿cuánto código complicado hay en este fichero?» y «¿qué símbolos con nombre puedo abrir
en el inspector?». Un callback no tiene nombre que enseñar, pero su complejidad sigue siendo código
que hay que mantener.

Lo que **sí** es un error es cómo se mide una función con cuerpo de expresión. `functionComplexity`
empieza a recorrer en `body.children`, así que el nodo del cuerpo nunca se visita. En una arrow con
bloque no pasa nada, porque el bloque no es una decisión; en una arrow con expresión, la expresión
es justamente la que contiene el `?:`, el `&&` o el `??`:

```ts
const pick = (x: number) => x ? 1 : 0;          // hoy: 1; debería ser 2
const both = (a: boolean, b: boolean) => a && b; // hoy: 1; debería ser 2
const block = (x: number) => { return x ? 1 : 0; }; // hoy: 2
```

El fallo no se queda en la lente de símbolos: `maxComplexity`, los hotspots, la deuda de migración
y la regla `complejidad-maxima` trabajan con esa cifra. Un fichero con callbacks de expresión puede
parecer más sencillo de lo que es.

## Decisión

### 1. La complejidad incluye el cuerpo entero

`functionComplexity` empieza en el nodo del cuerpo, no en sus hijos. Si el cuerpo es una expresión,
la expresión cuenta si es una decisión (`ternary_expression`, `conditional_expression`,
`binary_expression` con `&&`/`||`/`??`, etc.). Si el cuerpo es un bloque, el bloque no cuenta por
sí mismo y se recorren sus hijos como hasta ahora.

No se desciende a funciones anidadas: cada una se mide por separado. Una arrow que devuelve otra
arrow no hereda las decisiones de la segunda.

### 2. Dos recuentos, dos preguntas

- `functions` y `maxComplexity` cuentan **todas** las funciones implementadas, tengan nombre o no,
  estén anidadas o no.
- La lente de símbolos lista solo las **declaraciones con nombre**: funciones, clases, interfaces,
  tipos, enums y las constantes que guardan una función o una clase. Un callback anónimo no es un
  símbolo y no aparece en el inspector.

No se igualan las cifras. Se documenta la diferencia para que nadie la lea como un fallo y para que
el inspector no prometa una lista que no puede dar. Si hace falta explicar un `maxComplexity` alto
que no está en ningún símbolo, el dato correcto es «hay funciones anónimas», no un símbolo inventado.

### 3. Lo que cambia en el snapshot

No cambia el formato de `cc.json` ni su `apiVersion`. Cambian los **valores** de la complejidad en
los ficheros con arrows de expresión que contienen decisiones, y con ellos el checksum, como cambia
cualquier métrica que dependa del código. Una foto vieja se vuelve a analizar; no se migra a mano.

## Consecuencias

- La complejidad de una arrow de expresión deja de ser 1 por defecto y los hotspots, la deuda y las
  reglas de umbral ven el código que de verdad hay.
- Una función con cuerpo de bloque y otra con cuerpo de expresión que hacen lo mismo dan la misma
  complejidad.
- La lente de símbolos sigue siendo la lista de lo que se puede abrir por nombre; los callbacks
  anónimos siguen fuera, pero ahora está escrito y probado.
- Los tests de paridad CLI/navegador deben seguir pasando: el cálculo es el mismo módulo compartido.

## Alternativas descartadas

- **Contar solo las funciones con nombre en las métricas de fichero**: escondería la complejidad de
  los callbacks y haría que un fichero pareciera sencillo por no tener nombres. La complejidad es
  del código, no del nombre.
- **Inventar símbolos anónimos con nombres por línea**: rompería la identidad de las cadenas y el
  diff de símbolos, y llenaría el inspector de entradas que no se pueden abrir por nombre.
- **Seguir empezando en `body.children`**: mantiene el fallo en todas las arrows de expresión y
  subestima la complejidad de forma sistemática.

## Hoja de ruta

**Estado:** cerrado. No abre una fase: corrige la medición de M0 y la lente de M11.

- [x] **0040.1** `packages/parsers`: `functionComplexity` incluye el nodo del cuerpo; tests de arrow
  con `?:`, con `&&`, con bloque y con función anidada.
- [x] **0040.2** Los documentos y las descripciones de métricas explican que `functions` y
  `maxComplexity` incluyen callbacks anónimos, mientras que la lente de símbolos solo lista los
  nombres; test de un callback que no aparece como símbolo.
- [x] **0040.3** Suite completa, lint, typecheck, `check:action`, `site:build` y `web:build`; changelog
  con la verificación.
