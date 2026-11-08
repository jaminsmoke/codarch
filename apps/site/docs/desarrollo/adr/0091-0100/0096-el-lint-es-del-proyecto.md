---
title: "ADR 0096 — El lint es del proyecto"
description: "CodArch deja de declarar comandos de lint y pasa a leer el que el proyecto ya tiene: detecta su configuración y su herramienta, ejecuta el binario del repo, y enseña sistemas, reglas activas y hallazgos dentro de Reglas. Si no hay lint, recomienda el mínimo y no escribe nada."
section: desarrollo
status: aceptado
date: "2026-10-30"
sidebar:
  label: El lint es del proyecto
  order: 96
---

**Estado:** aceptado · **Fecha:** 2026-10-30 · **Enmendado por** el [ADR 0111](../0111-0120/0111-codarch-es-panel-de-control-del-lint.md): la config se puede editar desde la ficha, siempre como única fuente de verdad.

## Contexto

El [ADR 0094](0094-el-lint-en-el-mapa.md) hizo que `codarch lint` lanzara las herramientas declaradas en
el bloque `lint:` de `.codarch.yml`, con el comando escrito a mano. Eso no inventa un análisis —el repo
dice qué corre—, pero **sí puede divergir del lint que el proyecto tiene**: el día que cambie su
configuración o su versión, el mapa sigue contando lo que diga el bloque. Y el comando escrito a mano
suele ser `npx <herramienta>`, que resuelve una versión que el repo no eligió: eso ya es inventar la
medida.

El [ADR 0095](0095-la-ficha-del-proyecto.md) puso los números del lint en **Métricas**, con su peso en
el riesgo. El detalle —qué sistemas hay, con qué configuración, qué reglas están activas y qué reglas
tienen hallazgos— no cabía allí: es lo que el proyecto **exige**, y ese relato ya tiene un sitio,
**Reglas**, junto a las reglas de arquitectura y la deuda de migración (ADR 0069, ADR 0092).

## Decisión

### 1. La fuente es el proyecto, no nuestro bloque

`codarch lint` **detecta** el lint del repo: busca su configuración (`eslint.config.*`, `.eslintrc*`,
`oxlint.json`, `ruff.toml`, `checkstyle.xml`, `go.mod`, `*.csproj`…) y su herramienta instalada. Si el
sistema se puede leer, lo ejecuta con **el binario del proyecto** y **su configuración**, pidiendo su
JSON. Biome sale de `node_modules`; Ruff y Checkstyle, que no viven ahí, del PATH, que es donde el
proyecto los tiene. Nunca ejecuta `npx` ni descarga nada: una configuración sin binario se enseña como
**declarada y no ejecutable**, con el motivo.

El bloque `lint:` de `.codarch.yml` **no desaparece**: pasa a ser un **override** para comandos que la
detección no cubre. Si está, manda; si no está, manda la detección. Esto enmienda el ADR 0094 en el
origen de las herramientas, no en el artefacto ni en su ciclo de vida.

### 2. El detalle vive en Reglas, no en una sección nueva

- **Métricas** conserva lo que ya tenía: errores, avisos e info, ficheros con hallazgos y score, con su peso
  en el riesgo del fichero. Son cifras, y las cifras son una métrica.
- **Reglas** gana el bloque de lint en las tres hojas: el proyecto enseña los sistemas detectados, su
  configuración y sus reglas activas; la carpeta y el fichero, las reglas con hallazgos en su ámbito y
  su cuenta. Repetir la lista de sistemas en cada hoja sería ruido: se lee una vez, en el proyecto.
- **Enmienda ([ADR 0104](../0101-0110/0104-el-lint-se-lee-por-hallazgos.md)):** sí hay una sección
  **Lint** en las fichas de código, y **Reglas** no está en ellas. Lint cuenta los hallazgos y su
  peso en el riesgo; el catálogo de reglas activas es configuración y no se enseña en la ficha.

Reglas cuenta **reglas** —activas, con su severidad de config— y cede los totales a Métricas. Las
mismas palabras en las dos hojas convertían un dato en dos: «22 errores» eran reglas configuradas en
Reglas y hallazgos en Métricas. Esto enmienda el ADR 0095 en el reparto: el número se queda donde
estaba y el detalle se va a Reglas.

### 3. Las reglas activas no se adivinan

- **ESLint** se resuelve con `eslint --print-config <fichero>`: lee la configuración real —flat config,
  plugins y overrides— y devuelve las reglas con su severidad. Un fichero de muestra del propio repo,
  nunca un fichero de configuración.
- **oxlint** se lee de su JSON. Sin configuración corre sus correcciones por defecto y se dice que no
  se enumeran.
- **Biome** enumera las reglas que escribe su configuración, con su nivel (`style/useConst`), sin las
  de `recommended`, que dependen de su versión.
- **Ruff** enumera sus **reglas**, no sus selectores: lee `select` y `extend-select` (menos `ignore` y
  `extend-ignore`), pide el catálogo a `ruff rule --all --output-format=json` —la versión del
  proyecto, no una lista nuestra— y expande por prefijo con la especificidad de Ruff: gana el selector
  más concreto y, si empatan, el ignorado. Sin catálogo, se listan los selectores y se dice. El
  catálogo —cientos de reglas que solo cambian al actualizar Ruff— se guarda en
  `.codarch/lint-cache.json` con la versión que lo dio y no se vuelve a pedir mientras esa versión
  siga siendo la del proyecto. Es una caché, no un artefacto: no entra en `lint.cc.json` ni en el
  checksum, y si `.codarch/` no existe no se crea para escribirla.
- **Checkstyle** se lee de su XML (`checkstyle -c <config> -f xml`), que trae fichero, línea, columna,
  severidad y la clase que lo produce; la regla se queda con el nombre de la clase sin el `Check`. Sus
  módulos salen de la config, sin contenedores (`Checker`, `TreeWalker`) ni filtros de supresión, que
  no miden nada.
- **go vet** se lee de su texto —`./pkg/a.go:12:3: mensaje`—, que no firma el analizador: sus
  hallazgos entran como `go vet` en vez de inventarse un nombre. **Los analizadores de .NET** se leen
  del texto de MSBuild que escribe `dotnet format` al verificar (`ruta(12,5): warning CA1822: …`), con
  su código como regla y su severidad. Ninguno de los dos enumera reglas: van con la versión de Go o
  con el SDK y `AnalysisLevel`, y se dice. Una lista plausible sería peor que un hueco.

Los hallazgos se leen de lo que escribe cada herramienta: JSON de Biome y Ruff, XML de Checkstyle.
Biome no da línea ni columna —su `span` son bytes— y Ruff no da severidad, así que no se calculan ni se
inventan; Checkstyle sí trae las dos.

### 4. Si no hay lint, se recomienda; no se escribe

Sin sistemas detectados no se ejecuta nada, no se crea `lint.cc.json` y no se toca el repo: el comando
sale con `1` y enseña el **mínimo recomendable** por lenguaje. La app dice «sin medir» y, si conoce el
stack, la misma recomendación, en las hojas de proyecto y de carpeta, que es donde se decide el lint
del repo; la del fichero no repite el aviso en cada fichero. El riesgo sigue sin dar peso al lint: `sin
medir` no es `limpio`.

### 5. El artefacto cuenta lo que el proyecto tiene

El artefacto se llama `.codarch/lint.cc.json`, en la familia de `cc.json` y `rest.cc.json`: dice de un
vistazo que es del producto y no el fichero de una herramienta. Sube a **1.1** con `meta.systems`
—nombre, configuración, reglas activas y motivo— además de `meta.tools`, que dice cuáles midieron. Un
artefacto `1.0` se sigue leyendo: sus herramientas pasan a ser sistemas sin configuración. Y el
`.codarch/lint.json` anterior se sigue leyendo con el nombre viejo, que no se vuelve a escribir. Sigue
fuera de `cc.json` y de su checksum (ADR 0029, ADR 0094).

**Enmienda ([ADR 0098](0098-el-lint-dice-que-arbol-midio.md)):** el artefacto sube a **1.2** con
`meta.tree` —el checksum del snapshot medido— y `summary.measured` —los ficheros que se miraron, con
los limpios dentro—, y los 1.0 y 1.1 se siguen leyendo sin esos campos.

**Enmienda (guía, 2026-10-31):** en **Reglas**, la severidad de una regla activa se rotula como
**configuración** («372 reglas como error») y no lleva la tinta de la deuda: una regla configurada como
error no es un error hasta que produce un mensaje. Solo los hallazgos —la tabla de reglas con
hallazgos— usan el rojo, el ocre y el azul. Antes, la barra de severidades del sistema y la lista de
reglas activas se pintaban con el color de la deuda, y la app parecía decir en Reglas lo que Métricas
negaba con un cero.

## Consecuencias

- El mapa y el riesgo cuentan la deuda del lint que el proyecto realmente tiene, con sus reglas.
- `codarch lint` sin `.codarch.yml` funciona en cualquier repo con ESLint, oxlint o Biome instalados, y
  con Ruff en el PATH.
- Las configuraciones sin herramienta y los sistemas sin lector se dicen; no se completan.
- La app puede enseñar qué sistema y qué regla producen cada hallazgo, por proyecto, carpeta y fichero.
- El bloque `lint:` sigue documentado como override para casos raros.
- El recuento del lint es uno solo: `@codarch/lint` suma errores, avisos, info, hallazgos y ficheros, y el
  CLI, la app y el MCP leen esa misma cuenta. Un `info` es un hallazgo, no deuda: no suma a errores
  ni a avisos.

- Los totales salen de los **mensajes**, no de las cuentas que declara cada fichero: un artefacto de
  fuera con `errors` y `messages` que no cuadren no puede hacer que Métricas y Reglas lean números
  distintos.

## Hoja de ruta

Fase **M67 — El lint es del proyecto**.

**Estado:** cerrada.

- ✅ Detección de sistemas por configuración y binario; ejecución con el binario del proyecto.
- ✅ El bloque `lint:` como override y `--no-detect`.
- ✅ Artefacto 1.1 con sistemas y reglas activas; lectura de 1.0.
- ✅ Reglas con los sistemas y las reglas activas en el proyecto, y los hallazgos por carpeta y fichero.
- ✅ La recomendación mínima por lenguaje en las hojas de proyecto y carpeta, sin escribir nada.
- ✅ Lectores de Biome, Ruff, Checkstyle, `go vet` y analizadores de .NET en el artefacto.
- ✅ Reglas de Biome desde su configuración (las `recommended` se declaran sin enumerar).
- ✅ Reglas de Ruff expandidas con el catálogo de `ruff rule` de su versión, cacheado por versión en
  `.codarch/lint-cache.json`.
- ✅ Reglas de Checkstyle desde su configuración (los módulos de su XML).
- ✅ El lint en el MCP: `get_lint_report` lee el artefacto con los sistemas, sus reglas activas y los
  hallazgos, con filtros por carpeta o fichero, regla y severidad.
- ✅ El artefacto 1.2 firma el árbol medido y guarda la cobertura (ADR 0098).
- ✅ `codarch analyze` lo ejecuta en su propia pasada, con `--no-lint` para omitirlo, y `serve` no
  remide el artefacto que ya es del árbol que sirve ([ADR 0099](0099-el-lint-se-mide-al-analizar.md)).

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
