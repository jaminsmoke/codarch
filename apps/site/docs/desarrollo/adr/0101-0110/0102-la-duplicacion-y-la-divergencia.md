---
title: "ADR 0102 — La duplicación y la divergencia, medidas"
description: "El modelo no mide el código copiado: una copia cuesta lo mismo que un original y una copia que se ha ido no se ve. Nace la lente `duplication` con su detector de ventanas, dos métricas por fichero y los pares `copy`/`diverging`, sin tocar la deuda de migración."
section: desarrollo
status: aceptado
date: "2026-10-31"
sidebar:
  label: La duplicación y la divergencia
  order: 102
---

**Estado:** aceptado · **Fecha:** 2026-10-31

## Contexto

El mapa mide tamaño, complejidad, acoplamiento, ciclos, churn y deuda de migración. No mide una de las
formas más comunes de deuda: **el código copiado**. Copiar un fichero no cuesta nada en el modelo —cada
copia paga su propia deuda como si fuera única— y una copia que se ha ido separando tampoco se ve,
porque nadie compara cuerpos.

La pasada de esta semana por el propio repo lo dejó a la vista. Sobre 384 ficheros TS/TSX de
producción (sin tests), 36.641 líneas significativas y **33.931 ventanas de 8 líneas**, 580 ventanas
(1,7 %) aparecen también en otro fichero y 73 ficheros tienen al menos una. Hay **dos ficheros
idénticos** (`apps/cli/src/version.ts` y `apps/desktop/src/version.ts`; `apps/web/src/main.tsx` y
`apps/desktop/src/renderer/main.tsx`) y **55 bloques repetidos dentro del mismo fichero** (~440 líneas).
Los pares con más bloques compartidos son los que importan:

| Bloques | Par | Qué es |
|---|---|---|
| 45 | `schema/browser.ts` ↔ `schema/index.ts` | dos listas de export mantenidas a mano |
| 21 | `parsers/go/analyze.ts` ↔ `parsers/python/analyze.ts` | el mismo esqueleto de recorrido |
| 20 | `parsers/go/analyze.ts` ↔ `parsers/java/analyze.ts` | el mismo esqueleto, otra gramática |
| 16 | `cli/args/analyze.ts` ↔ `cli/args/lint.ts` | parseo de argumentos por comando |
| 16 | `metrics/browser.ts` ↔ `metrics/index.ts` | otra entrada, otra lista de export |
| 15 | `parsers/csharp/analyze.ts` ↔ `parsers/go/analyze.ts` | el esqueleto, una vez más |
| 14 | `lint/browser.ts` ↔ `lint/index.ts` | la misma lista de export |
| 9 | `desktop/renderer/App.tsx` ↔ `web/App.tsx` | dos arranques que se copian |
| 7 | `cli/commands/profiles.ts` ↔ `mcp/tools/config.ts` | duplicación **entre paquetes** |

Y la divergencia ya existe: los cuatro analizadores comparten el bucle pero no la regla de comentario
—Go la detecta por texto, Java por nodo, Python por tipo de nodo—, y las entradas `browser`/`index` de
tres paquetes mantienen dos listas de export que pueden separarse sin que nada falle.

La deuda de migración no cubre esto. Es `(maxComplexity + 1) × (1 + fanIn)` **por fichero TS/JS**
([ADR 0016](../0011-0020/0016-lente-migracion.md)): un cuerpo copiado pesa lo mismo que uno original, y
la cifra agregada **no se conserva al partir**. Medido en la misma pasada: 13.342 antes de partir el
store del MCP, **13.451 después**, 13.252 tras partir el almacén de la UI. El ranking lo manda el
fan-in: `mcp/store.ts` marca 256 con 212 líneas, y `lint/project.ts`, con 964 líneas y complejidad 33,
marca 102 porque solo lo importan dos ficheros. Sin una lectura de duplicación, el proyecto puede subir
de deuda copiando código y nadie lo ve.

## Decisión

### 1. Una lente `duplication` dentro de `cc.json` 2.x

La lente es opcional, determinista y viaja con el snapshot. Tres piezas:

```ts
type CcDuplicationNode = {
  /** Líneas rloc dentro de bloques compartidos con otro fichero. */
  duplicatedLines: number
  /** Líneas rloc dentro de bloques repetidos en el mismo fichero. */
  repeatedLines: number
  /** Ruta del gemelo canónico, solo si el fichero entero es idéntico. */
  duplicateOf?: string
}

type CcDuplicatePair = {
  fromId: string
  toId: string
  /** Líneas compartidas, contadas una vez por bloque maximal. */
  lines: number
  /** 0..100: ventanas compartidas / mínimo de ventanas de los dos. */
  similarity: number
  status: "copy" | "diverging"
}

type CcDuplicationSummary = {
  pairs: number
  copies: number
  duplicatedLines: number
  repeatedLines: number
  /** 0..100 sobre el rloc del árbol. Se calcula al leer, no se suma. */
  ratio: number
}
```

`nodes` va por `id` de fichero, como la lente de migración; `pairs` es una lista ordenada; `summary`
lleva las cifras del árbol. Un `duplicateOf` idéntico se resuelve por la ruta menor: el grupo entero
apunta al mismo canónico, y los dos lados conservan sus `duplicatedLines`.

### 2. Dos métricas por fichero, en la lente de métricas

`duplicatedLines` y `repeatedLines` son **absolutas**, enteras y con `direction: -1`, como el resto de
métricas del modelo. La proporción no es una métrica: se calcula al leer (`duplicatedLines / rloc`) y
nunca se suma entre ficheros, porque dos porcentajes no se agregan. Las carpetas y el proyecto suman
líneas y dividen por su `rloc`, que es lo que sí se conserva.

### 3. El detector: ventanas de 8 líneas normalizadas

- **Líneas significativas**: las mismas que cuenta `rloc` —una línea con al menos un token de código—,
  con los comentarios detectados por su texto ([ADR 0020](../0011-0020/0020-analisis-en-el-navegador.md),
  [ADR 0076](../0071-0080/0076-las-lineas-no-son-codigo.md)). Se normaliza el espacio: `trim`, sin
  líneas vacías, sin cierres sueltos.
- **Ventana `K = 8`**: ocho líneas significativas consecutivas, con su SHA-256. Ocho es el corte que
  deja fuera un wrapper de tres líneas y dentro una función de verdad; es una constante del modelo, no
  una opción de cada repo.
- **Duplicado**: una ventana que aparece en **dos ficheros distintos** o **dos veces en el mismo
  fichero** sin solaparse consigo misma. Las ventanas contiguas se funden en bloques maximales antes de
  contar líneas, así que `lines` es la unión de rangos, no `ventanas × 8`.
- **Ficheros pequeños**: con menos de ocho líneas significativas no hay ventana y no hay falso positivo.
- **Lenguajes**: el detector no sabe de gramáticas. Entra todo lo que el mapa analiza —TS/JS, Java,
  Python, Go y C#— porque la normalización es la misma que ya usa `rloc`. Dos ficheros de lenguajes
  distintos con el mismo texto son un par más; no se descarta nada por extensión.
- **Alcance**: el del análisis ([ADR 0038](../0031-0040/0038-el-alcance-del-analisis.md)). No hay una
  segunda lista de exclusiones; si los tests o un vendor están en el mapa, cuentan. Excluirlos es una
  línea del `.codarch.yml`, no una regla oculta de la lente.
- **Determinismo**: los pares se ordenan por similitud, líneas, `fromId` y `toId`; los bloques, por
  rango; sin fechas ni orden de filesystem.

### 4. La divergencia tiene nombre

Un par mide **cuánto comparte** y **cuánto se ha ido**:

- `similarity = ventanas compartidas / min(ventanas de A, ventanas de B)`, en 0..100.
- **`copy`**: `similarity = 100`. El par es una copia literal (normalizada).
- **`diverging`**: `similarity` entre **40 y 99** y al menos una ventana compartida. La copia se está
  separando: comparte esqueleto y ya no comparte todo.
- Por debajo de 40 no hay par. Un umbral bajo llena el snapshot de coincidencias de azar y convierte la
  lente en ruido; 40 es el corte que separa «se copió» de «se parece».

### 5. Qué no se cuenta en v1

- **Clones con renombrado o reformateo**: la normalización ignora espacios y comentarios, no nombres ni
  literales. Un cuerpo copiado y renombrado comparte menos ventanas y puede quedar fuera; detectarlo
  pide normalizar identificadores o comparar árboles, y eso rompe la paridad nativo/WASM
  ([ADR 0020](../0011-0020/0020-analisis-en-el-navegador.md)).
- **Documentos, CSS y assets**: viven en `rest.cc.json` ([ADR 0093](../0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md)).
  La lente es del mapa de código.
- **Historial de la duplicación**: comparar snapshots es trabajo del diff (M71), no de la lente.
- **Código generado o minificado**: se excluye por alcance si molesta; la lente no adivina el origen.

### 6. La deuda de migración no se toca

`migrationDebt` sigue siendo la de [ADR 0016](../0011-0020/0016-lente-migracion.md): coste de migrar un
fichero TS/JS. La duplicación **no se suma** a ella por tres razones: una copia no cuesta migrarla dos
veces, la deuda no se conserva al partir y el porcentaje no es aditivo. Son dos lecturas distintas y se
enseñan al lado, no fundidas. Que la deuda agregada pueda subir al descomponer un fichero deja de ser
una trampa cuando la duplicación se ve: partir sin copiar no sube el código repetido, y copiar sí.

### 7. Checksum y compatibilidad

La lente entra en `{ files, lenses }`, como las demás: un repo con código copiado cambia de checksum
cuando aparece la copia, y dos análisis del mismo árbol dan el mismo. No hay campo nuevo en `meta` ni
sube `apiVersion`: es una lente opcional de 2.x. Un snapshot anterior **no tiene duplicación medida**,
que no es lo mismo que cero; la app lo dice así, igual que con el lint ([ADR 0098](../0091-0100/0098-el-lint-dice-que-arbol-midio.md)).
Un consumidor que no conozca la lente la ignora.

### 8. Dónde se lee

La medida nace en el parser y el snapshot (M68), se pinta en el mapa y las fichas (M69), la divergencia
gana su lista (M70) y el diff, el PR y el MCP la cuentan (M71). El mapa no cambia de área: el área sigue
siendo `rloc`; la duplicación es un color y una ficha, no una tercera dimensión.

## Consecuencias

- El código copiado deja de ser gratis: aparece en el fichero, en la carpeta y en el proyecto, y una
  copia que se separa tiene nombre (`diverging`) en vez de quedarse a medias.
- El `main.tsx` de la web y el del escritorio son un par `copy` desde el primer análisis, y los
  barrels de `schema` y `lint` contra sus módulos salen como `diverging`: la lista de trabajo real.
- La deuda de migración mantiene su fórmula y su ranking; la duplicación no la maquilla.
- El snapshot crece con los pares que superan el umbral. La lista se ordena y la UI recorta con `+N más`;
  el snapshot no recorta, porque un reporte no puede depender de lo que cupo en pantalla.
- El detector usa las líneas significativas del parser, así que el CLI y el navegador miden lo mismo y
  el checksum coincide ([ADR 0020](../0011-0020/0020-analisis-en-el-navegador.md)).
- Tests: el corte de `K` (7 líneas no, 8 sí), el fichero idéntico y su canónico, la repetición interna,
  los umbrales de similitud, el alcance con `ignore`, la determinación (dos pasadas, mismo checksum), la
  lectura de un snapshot sin lente y la paridad de la normalización entre gramáticas.
- Un plugin o un addon siguen sin poder añadir lentes ni tocar el checksum ([ADR 0029](../0021-0030/0029-los-addons.md)).

## Alternativas descartadas

- **Clones por AST o por tokens.** Detectaría renombrados, pero depende de la gramática: el parser
  nativo y el WASM tendrían que dar el mismo árbol, y hoy la paridad se sostiene en las líneas
  ([ADR 0020](../0011-0020/0020-analisis-en-el-navegador.md)). Además cuesta un recorrido más por
  fichero.
- **MinHash o LSH.** Aproxima la similitud y mete un umbral probabilístico en el checksum: dos pasadas
  podrían no dar el mismo snapshot.
- **Una métrica de porcentaje por fichero.** No se puede sumar en una carpeta ni en el proyecto; el
  total diría cosas distintas según cómo se agregue. Las líneas sí se suman.
- **Sumar la duplicación a `migrationDebt`.** Cambia el significado de la deuda de ADR 0016 y castiga
  dos veces el mismo cuerpo; además la deuda ya no se conserva al partir.
- **Medir solo TS/JS.** Deja fuera cuatro de los seis lenguajes que el producto ya analiza, justo donde
  el esqueleto copiado entre analizadores es el caso real.
- **Un plugin o un addon que aporte la lente.** El checksum no puede depender de lo instalado
  ([ADR 0029](../0021-0030/0029-los-addons.md)).
- **Detectar renombrados en v1.** Es la mejora natural de la lente, no su primera versión: primero se
  mide lo que se copia tal cual, que ya es deuda.

## Hoja de ruta

### M68 — La duplicación, medida

- ✅ El detector de ventanas de 8 líneas sobre las líneas significativas del parser, con bloques
  maximales y repetición interna.
- ✅ La lente `duplication` en el snapshot: nodos, pares y resumen, con sus descriptores.
- ✅ `duplicatedLines` y `repeatedLines` en la lente de métricas, con `direction: -1`.
- ✅ La lente dentro del checksum y la lectura de un snapshot que no la trae como **sin medir**.
- ✅ Tests del corte de `K`, del idéntico y su canónico, de la repetición interna, de los umbrales, del
  alcance y de la determinación.
- ✅ Medir este repo con su propia lente: **598 ficheros**, **2.183 líneas duplicadas** y **518
  repetidas** (el 3 % de `rloc`), en **5 pares** —uno `copy`, los dos `main.tsx`, y cuatro `diverging`—.
  Las cifras quedan en la [guía](/desarrollo/guia/).

### M69 — La duplicación, en el mapa

- ⬜ Un color más en el dock y en la leyenda: `duplicatedLines` sobre la escala del mapa, con su aviso
  cuando no hay lente.
- ⬜ La ficha del fichero gana **Duplicación**: líneas, proporción sobre `rloc` y sus pares.
- ⬜ La hoja de la carpeta y la del proyecto suman líneas y dividen por su `rloc`; el porcentaje nunca
  se suma.
- ⬜ La captura (`codarch shot`) pinta el color nuevo con la misma escala que la app.

### M70 — La divergencia, con nombre

- ⬜ La lista de pares con su estado `copy`/`diverging`, su similitud y sus líneas, ordenada y con
  `+N más`.
- ⬜ El filtro por estado y el salto de un par a sus dos fichas.
- ⬜ El aviso de divergencia en la ficha: «comparte el 72 % con `…`».
- ⬜ Tests del orden, del filtro, del corte y del enlace entre par y ficheros.

### M71 — La duplicación, en el diff

- ⬜ La sección **Duplicación** del reporte: pares nuevos, pares que se separan y líneas ganadas o
  perdidas.
- ⬜ El comentario del PR y la acción, con el mismo corte y el mismo resumen que la app.
- ⬜ Una consulta del MCP para la duplicación y los pares de un ámbito.
- ⬜ Una regla optativa `duplication-max` en `.codarch.yml`, solo si el uso la pide.
- ⬜ Tests del diff (par nuevo, par roto, sin lente en base o en head).

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
