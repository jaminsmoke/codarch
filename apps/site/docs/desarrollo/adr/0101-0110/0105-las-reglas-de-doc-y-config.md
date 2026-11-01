---
title: "ADR 0105 — Las reglas de doc y config"
description: "El mapa del resto enseña qué hay, no qué está roto. Las reglas de documentos y configuración se deciden aquí: enlaces rotos, documento huérfano, frontmatter que no cuadra y la gemela declarada, medidas como hallazgos en su propio artefacto —con el checksum del resto— y leídas solo en ese mapa, con la sección Reglas."
section: desarrollo
status: aceptado
date: "2026-11-01"
sidebar:
  label: Las reglas de doc y config
  order: 105
---

**Estado:** aceptado · **Fecha:** 2026-11-01

## Contexto

El mapa del resto existe desde el [ADR 0093](0093-el-mapa-de-lo-que-no-es-codigo.md):
documentos, configuración y assets tienen su snapshot, su checksum y su lente de tipo. Enseña
**qué hay** —cuántos documentos, cuánto ocupan, quién enlaza a quién— pero no dice **qué está
roto**. La mitad del proyecto se ve, y de esa mitad no se sabe nada: un enlace a un fichero que ya
no existe, un documento al que no llega nadie y un frontmatter que el sitio rechaza se descubren al
publicar, no al analizar.

El propio ADR 0093 dejó estas reglas fuera a propósito y con el marco escrito: son **suyas**, no de
arquitectura; la gemela de idioma **se declara** en `.codarch.yml` y no se adivina por el nombre de
una carpeta. El [ADR 0104](0104-el-lint-se-lee-por-hallazgos.md) cerró la otra mitad: el lint se lee
por hallazgos, la sección **Reglas** vive solo en el mapa del resto, y las reglas de arquitectura
serán una subsección cuando se fijen.

La materia prima ya está en el snapshot del resto: el `kind` de cada fichero, sus bytes y sus líneas,
y los enlaces entre documentos como aristas del grafo. Una regla que los lea no necesita un proceso
externo ni una segunda pasada.

## Decisión

### 1. Son hallazgos, con el vocabulario del lint

Regla, severidad (`error`, `warn`, `info`), mensaje y, cuando se sepa, línea. Es la misma forma que
produce el lint del código y la misma que la app ya sabe leer: la cuenta, el peor color, la lista por
regla y el punto de la barra. No se inventa un segundo idioma para lo que es lo mismo.

```mermaid
flowchart LR
  r[".codarch/rest.cc.json<br/>árbol, tipo y enlaces"] --> g["reglas del resto<br/>puras, sin proceso externo"]
  c["`.codarch.yml`<br/>entradas, gemelas, frontmatter"] --> g
  g --> a[".codarch/lint-rest.repmod.json<br/>meta.tree = resto"]
  a --> s["hojas del resto<br/>Reglas · punto de la barra"]
```

### 2. Artefacto propio, del árbol del resto

`.codarch/lint-rest.repmod.json`, con el mismo formato que el lint del código y su nombre en el
registro del [ADR 0100](0100-los-nombres-de-los-artefactos.md). Su `meta.tree` es el **checksum del
resto**: la propiedad que hace legible la medida —«esto se midió sobre este árbol»— vale igual aquí,
y mezclar dos árboles en un artefacto obligaría a que uno de los dos mintiera. `meta.tools` dice
`codarch`: estas reglas las pone el producto, no un linter instalado.

El artefacto del código **no cambia**: ni su contenido, ni su checksum, ni su significado. El mapa
del código no carga este.

### 3. Se miden al analizar, en la misma pasada

`codarch analyze` y `serve` escriben el artefacto junto al resto: las reglas son funciones puras
sobre lo que el recorrido ya leyó, así que no hay proceso que arrancar ni coste que justifique otra
pasada. `codarch lint` sigue midiendo el código con las herramientas del repo y no lo escribe; sus
reglas no dependen de ninguna de ellas.

### 4. Cuatro reglas en v1

| Regla | Severidad por defecto | Qué dice |
|---|---|---|
| `doc/broken-link` | `error` | un enlace relativo apunta a una ruta que el árbol no tiene |
| `doc/orphan` | `info` | a un documento no llega ningún enlace y no está declarado como entrada |
| `doc/frontmatter` | `error` | el frontmatter no se puede leer o le falta una clave que el glob exige |
| `doc/twin-missing` | `warn` | a un documento de la colección declarada le falta su gemela, o al revés |

- **Enlaces.** Se resuelven contra el árbol del resto, que es el alcance del mapa. Se ignoran las
  URLs externas (`http`, `https`, `mailto`, `tel`), los anclajes solos (`#seccion`) y las rutas
  absolutas (`/docs/...`), que son rutas del sitio y no ficheros del repo. Un enlace con ancla
  (`otro.md#seccion`) se comprueba por su ruta.
- **Huérfanos.** Solo cuentan los documentos: un documento sin aristas de entrada. Las entradas se
  declaran (`README.md`, el índice de la colección), porque un README raíz nunca recibe enlaces y
  marcarlo sería ruido desde el primer análisis.
- **Frontmatter.** Solo se comprueba donde se declara: un glob con sus claves obligatorias. Un
  documento fuera de esos globs no se juzga, y una colección con su propio esquema declara el suyo.
- **Gemelas.** Por parejas declaradas: `from` y `to`, y la misma ruta relativa en las dos. Ni se
  adivina por el nombre de la carpeta ni se deduce del idioma.

### 5. Se configuran en `.codarch.yml`, bajo `docs:`

El alcance es uno ([ADR 0038](0038-el-alcance-del-analisis.md)) y la gemela se declara
([ADR 0093](0093-el-mapa-de-lo-que-no-es-codigo.md)). Las severidades se pueden cambiar una a una,
como las de las reglas de arquitectura; el resto de claves tiene un valor por defecto sensato y
vaciarlas apaga la regla.

```yaml
docs:
  entries:
    - README.md
    - docs/index.md
  twins:
    - from: docs
      to: docs/en
  frontmatter:
    - files: docs/**/*.md
      required: [title, description, section, sidebar]
  severity:
    doc/orphan: info
```

### 6. Se leen solo en el mapa del resto

- La hoja de un documento enseña sus hallazgos con su regla, su texto y su línea cuando la haya.
- Las hojas de carpeta y de proyecto del resto los agrupan por regla, con su cuenta.
- La sección se llama **Reglas**, no Lint: habla de documentos y configuración, y el
  [ADR 0104](0104-el-lint-se-lee-por-hallazgos.md) dejó ese nombre para este mapa.
- El punto de la barra es el mismo: la peor severidad del ámbito, sin punto si está limpio o sin
  medir.
- **No pesan en el riesgo del código**: el resto no tiene complejidad ni deuda de lint, y el riesgo
  sigue midiendo el código. Las reglas del PR, el diff y la acción no los miran
  ([ADR 0093](0093-el-mapa-de-lo-que-no-es-codigo.md), punto 5).

### 7. Deterministas, como todo lo que se guarda

Los hallazgos se ordenan por ruta, luego por regla y luego por línea; los enlaces se resuelven contra
el árbol, nunca contra el sistema de ficheros; no hay fechas, rutas absolutas ni orden de recorrido.
El checksum del artefacto es el de su contenido, como el del lint.

### 8. Sin la línea del enlace en v1

El snapshot del resto guarda los enlaces como aristas, no la línea donde están. La regla nombra el
destino y el documento que lo enlaza, que ya dice qué arreglar; llevar la línea y la columna pide
una lente `rest.links` que no existe todavía. Queda abierto, no fingido con un `line: 1`.

## Consecuencias

- Un artefacto más en `.codarch/`, con su nombre en el registro, y `analyze` lee el frontmatter de
  los documentos que ya estaba leyendo para contar líneas.
- El mapa del resto gana su sección **Reglas** y su punto en la barra; el del código no cambia de
  contenido, ni de riesgo, ni de checksum.
- Un repo con la carpeta de otro idioma y sin declararla no recibe la regla de la gemela: se pierde
  una señal, no se inventa un aviso.
- Las rutas absolutas del sitio se ignoran a propósito: un enlace a `/docs/x` no se puede comprobar
  contra el árbol y marcarlo sería un falso positivo en cada página.
- El lint del resto no se puede quedar «de otro árbol» sin decirlo: su `meta.tree` lo delata, igual
  que el del código ([ADR 0098](0098-el-lint-dice-que-arbol-midio.md)).

## Alternativas descartadas

- **Escribirlas dentro de `lint.repmod.json`.** Un artefacto tiene un `meta.tree`; con dos árboles,
  uno de los dos mentiría, y el del código dejaría de significar «este código».
- **Un linter externo de Markdown.** Añade una dependencia y un proceso para cuatro reglas que salen
  del snapshot que ya está en memoria, y sus mensajes no hablan de gemelas ni de entradas
  declaradas.
- **Adivinar la gemela por el nombre de la carpeta.** Es exactamente lo que el ADR 0093 prohíbe.
- **Solo enlaces rotos.** Responde «qué apunta mal», no «qué documento no llega a nadie», que es la
  otra mitad de la pregunta.
- **Llevarlas al diff y al PR en v1.** El PR es del código y el corte del ADR 0093 sigue en pie; si
  algún día entran, entran con su decisión.
- **Marcar los huérfanos sin entradas declaradas.** Cada README raíz y cada licencia serían un
  hallazgo el primer día.

## Hoja de ruta

Fase **M76 — Las reglas del resto**.

- ✅ Las cuatro reglas puras sobre el árbol del resto, con tests y un caso de determinismo por regla.
  `docsFindings` en `@codarch/lint`, con `readFrontmatter` y `matchesGlob`.
- 🟡 La lectura de enlaces y frontmatter sobre lo que el recorrido ya guarda: el frontmatter ya se
  lee; los enlaces los lee el recorrido y todavía no se los pasa.
- ⬜ `.codarch/lint-rest.repmod.json`, escrito por `analyze` y `serve`, con `meta.tree` del resto y su
  nombre en el registro.
- ⬜ `docs:` en `.codarch.yml`, con entradas, gemelas, frontmatter y severidades, validado al leer.
- ⬜ La sección **Reglas** en las tres hojas del resto y el punto de la barra.
- ⬜ La línea del enlace, si el mapa del resto llega a guardarla.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
