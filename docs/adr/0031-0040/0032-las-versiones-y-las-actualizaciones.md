# ADR 0032 — Las versiones y las actualizaciones

**Estado:** aceptado · **Fecha:** 2026-10-22

## Contexto

El producto ya tiene versiones ✓, pero cada una por su cuenta ✓ y sin regla ✓:

- El **CLI** ✓ (`codarch@0.2.0` ✓, en npm ✓) lleva la suya en `apps/cli/package.json` ✓, y el
  empaquetado la inyecta ✓ (`__CODARCH_VERSION__` ✓). `codarch --version` ✓ la enseña ✓.
- La **app de escritorio** ✓ (`@codarch/desktop@0.2.0` ✓) lleva la suya en su `package.json` ✓ y el
  CI publica instaladores ✓ en las releases de GitHub ✓ cuando hay un tag `desktop-v*` ✓.
- La **app web** ✓ no tiene versión propia ✓: la sirve el CLI ✓, así que su versión es la del CLI ✓
  (`meta.json` ✓ ya la enseña ✓).

El resultado ✓: dos números que hoy coinciden ✓ por casualidad ✓, sin nadie que lo decida ✓; y
**nadie sabe si hay algo nuevo** ✓. El usuario se entera de la actualización cuando algo se rompe ✓.

Además, el CI ya sube los `.blockmap` ✓ del escritorio ✓ —que son justo lo que necesita una
actualización automática ✓— pero el `electron-builder` **no declara `publish`** ✓, así que no se
genera la información de actualización ✓, y el repositorio de las apps es **privado** ✓: aunque se
generara ✓, un usuario no podría descargarla ✓.

## Decisión

### 1. Una versión para el producto

La versión vive en el `package.json` de la raíz ✓ y de ahí sale para todas las piezas ✓:

| Pieza | Versión | Dónde se actualiza |
|---|---|---|
| CLI (`codarch`) | la del producto ✓ | npm ✓ |
| App de escritorio | la del producto ✓ | releases de GitHub ✓ |
| App web | la del CLI que la sirve ✓ | al actualizar el CLI ✓ |

Un cambio de versión se propaga con `npm run version:<x>` ✓, que escribe los tres sitios ✓, y el CI
comprueba que cuadran ✓: si no, falla ✓. Nada de «se me olvidó el del escritorio» ✓.

### 2. El motor de comprobación vive en el core

`@codarch/versions` ✓ sabe comparar versiones ✓ y preguntar por una fuente ✓, **sin red propia** ✓:
el `fetch` se inyecta ✓, así que los tests no tocan la red ✓.

- **npm** ✓: `registry.npmjs.org/<paquete>/latest` ✓ → la versión publicada ✓.
- **GitHub** ✓: la release más reciente ✓ del repositorio ✓ → su etiqueta ✓.

La comparación es de semántica simple ✓: `mayor.menor.parche` ✓, con prerelease ✓ después de la
versión estable ✓.

### 3. Las apps tienen una sección **Actualizaciones**

En los ajustes ✓ de las dos apps ✓, al lado de **Diagnóstico** ✓:

- Qué versión se está usando ✓ y de dónde sale ✓.
- Si hay algo más nuevo ✓, y **cómo se trae** ✓.
- Un botón **Comprobar ahora** ✓.

Nada se descarga ni se instala sin que el usuario lo pida ✓: la comprobación ocurre al abrir la
sección ✓ o al pulsar el botón ✓. Sin red por sorpresa ✓.

### 4. El escritorio se actualiza con la release de GitHub

La sección del escritorio **comprueba** las releases ✓ y abre la release ✓ en el navegador ✓, y
desde ahí se descarga el instalador ✓. Los instaladores van **sin firmar** ✓, así que el sistema
avisará ✓; por eso el flujo es «abre la release y descarga" ✓ y no una instalación silenciosa ✓.

Para que eso sirva a alguien que no sea el dueño ✓, las releases del escritorio tienen que estar en
un **repositorio público** ✓: hoy el repo es privado ✗. El camino es el del action ✓: un repo
público generado ✓ (`jaminsmoke/codarch-desktop` ✓) con las releases dentro ✓. El feed es
configurable ✓ (`CODARCH_UPDATE_REPO` ✓) ✓.

### 5. El CLI se actualiza con npm

`codarch version` ✓ dice la versión ✓ y de dónde sale ✓. `codarch version --check` ✓ pregunta en npm
✓ y dice si hay algo nuevo ✓ y con qué comando se trae ✓. No instala nada ✓: actualizar un
instalador global desde dentro de sí mismo ✓ es pedir problemas ✓.

### 6. Alpha: hasta que el producto esté maduro, la versión lo dice

El producto **funciona** ✓ pero todavía no está maduro ✓: se le cambian las cosas ✓, la app de
escritorio es una copia ✓ de la web ✓, y el modelo —que sí se promete ✓— está en 2.x ✓.

Mientras sea alpha ✓, la versión lleva prerelease ✓ (`0.3.0-alpha.1` ✓):

- En **npm** ✓, la alpha va a la etiqueta **`next`** ✓: `npm run publish:cli` ✓ lo decide solo ✓
  según la versión ✓. `latest` ✓ se queda con la última versión normal ✓, para que nadie se instale
  un alpha sin querer ✓.
- El **README** ✓ lo dice arriba ✓, en un aviso ✓: la funcionalidad está ✓, el producto no ✓, y lo
  que **sí** es estable ✓ es el modelo `cc.json` ✓ y su checksum ✓.
- La **app de escritorio** ✓ se etiqueta igual ✓ (`desktop-v0.3.0-alpha.1` ✓).

Y el día que el producto esté maduro ✓, la versión deja de llevar prerelease ✓ y vuelve a `latest` ✓
sin tocar nada más ✓.

## Consecuencias

- El CLI gana `codarch version` ✓ (con `--check` ✓) y las apps ganan la sección **Actualizaciones** ✓.
- `@codarch/versions` ✓ entra en el core ✓, con sus tests ✓: comparar ✓ y preguntar ✓ con un `fetch`
  de mentira ✓.
- `npm run version -- <x>` ✓ propaga la versión ✓ y el CI la comprueba ✓.
- El feed del escritorio queda **configurable** ✓, para poder apuntarlo al repo público ✓ cuando
  exista ✓.
- La web **no** se actualiza sola ✓: la sirve el CLI ✓, así que su versión es la del CLI ✓ y lo que
  se actualiza es el CLI ✓.

## Alternativas descartadas

- **Un `codarch update`** ✓ que instale solo ✓: actualizar un instalador global desde dentro de sí
  mismo ✓ es pedir problemas ✓. El comando se enseña ✓, no se ejecuta ✓.
- **`electron-updater`** ✓ con instalación silenciosa ✓: exige `publish` ✓ en el empaquetado ✓, un
  feed público ✓ y firma ✓ para que el sistema no avise en cada actualización ✓. Con instaladores sin
  firmar ✓, descargar y abrirlos ✓ es más honesto ✓. Queda como siguiente paso ✓.
- **Un backend propio** ✓ que diga qué hay nuevo ✓: el producto no tiene servidor ✓, y npm ✓ y
  GitHub ✓ ya lo dicen ✓.
- **Versiones independientes por pieza** ✓: más flexible ✓, pero dos números que hoy coinciden por
  casualidad ✓ y que nadie Decide ✓.

## Hoja de ruta

Sin fases abiertas: M21 está cerrada.

### Ideas abiertas

- [La guía: el registro público de plugins](../../guideline/contenido.md#el-registro-publico-de-plugins)
  publicar el escritorio para que **los terceros** puedan actualizarlo.

El detalle de lo hecho está en el [changelog](0032-las-versiones-y-las-actualizaciones.changelog.md).

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
