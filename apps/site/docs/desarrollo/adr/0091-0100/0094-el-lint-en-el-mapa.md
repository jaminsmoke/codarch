---
title: "ADR 0094 — El lint, en el mapa"
description: "El lint de código no es una regla de arquitectura ni un cambio: es lo que dicen ESLint, oxlint y sus equivalentes. Gana su propio artefacto, una cuarta señal del riesgo y dos vistas —fichero y carpeta—, más una lente que colorea por cantidad ponderada."
section: desarrollo
status: aceptado
date: "2026-10-29"
sidebar:
  label: El lint, en el mapa
  order: 94
---

**Estado:** aceptado · **Fecha:** 2026-10-29

## Contexto

El panel derecho tiene tres entradas —**Fichero**, **Carpeta** y **Cambios**— y el mapa pinta el
riesgo con tres señales: complejidad, churn y tamaño
([ADR 0008](0001-0010/0008-diseno-mapa-2d.md), [ADR 0057](0051-0060/0057-la-ficha-del-fichero-habla-de-sus-lentes.md)).
Las **reglas** de arquitectura ya tienen su sitio en la ficha del fichero
([ADR 0069](0061-0070/0069-dos-pestanas.md)) y su agregación por carpeta está en la hoja de ruta del
[ADR 0092](0091-0100/0092-la-carpeta-tiene-su-ficha.md).

El **lint** es otra cosa y todavía no existe en el producto:

- No sale del snapshot. Lo dicen herramientas externas —oxlint, ESLint, ruff, checkstyle, `go vet`—,
  con sus versiones y su configuración. Meterlo en `cc.json` rompería la regla que sostiene el
  checksum: **depende del código, no de lo que tengas instalado** ([ADR 0029](0021-0030/0029-los-addons.md)).
- Tampoco es un diff. Se mide sobre el árbol, no contra `HEAD`, así que no es una violación de
  `report.json`: cambia el formato de un reporte que hoy solo habla de cambios
  ([ADR 0010](0001-0010/0010-diff-entre-snapshots.md), [ADR 0011](0011-0020/0011-reglas-de-arquitectura.md)).
- Y es una señal fuerte de dónde duele el código, que es exactamente lo que el mapa contesta.

## Decisión

### 1. El lint tiene su artefacto, como el resto

`.codarch/lint.json`, escrito por `codarch lint`, consumido por la app y el MCP, con su propio
checksum y su propia versión. `cc.json` no cambia ni de contenido ni de checksum.

```ts
type LintArtifact = {
  schemaVersion: "1.0";
  meta: {
    checksum: string;   // md5 canónico de tools + files
    tools: string[];    // nombres, ordenados; sin rutas ni versiones
  };
  files: Record<string, {
    errors: number;
    warnings: number;
    messages: Array<{
      rule: string;
      severity: "error" | "warn" | "info";
      line?: number;
      column?: number;
      message: string;
    }>;
  }>;
  summary: { files: number; errors: number; warnings: number; messages: number };
};
```

Reglas del formato, las mismas que el snapshot: rutas relativas con `/`, sin rutas absolutas ni
timestamps, ficheros y mensajes ordenados por ruta, línea y regla. Un mensaje sin severidad conocida
cuenta como `warn`. Un fichero sin mensajes no aparece.

### 2. Quién lo ejecuta

`codarch lint` corre las herramientas que declara el repo en `.codarch.yml`:

```yaml
lint:
  - name: eslint
    command: npx eslint . --format json
    format: eslint-json
  - name: oxlint
    command: npx oxlint --format json .
    format: oxlint-json
```

- **Las herramientas se lanzan en paralelo**, cada una en su proceso; el comando espera a todas y
  normaliza lo que cada una devolvió. Es la v1 del «linter general»: no hay DSL ni plugins de lint.
- **Falla blando.** Una herramienta que no está o que revienta se avisa y las demás siguen; el
  artefacto se escribe con lo que sí se midió. Un código de salida distinto de cero del linter no es
  un fallo del comando si dejó su JSON.
- **El comando no bloquea por defecto.** `--fail-on errors` es lo que usa CI; la app y el MCP solo
  leen.
- **`analyze` no linta.** El mapa de código sigue siendo barato y no depende de tener ESLint
  instalado. `serve` sí lo refresca tras una pasada con cambios, en paralelo con el análisis
  ([ADR 0056](0051-0060/0056-el-live-no-repite-el-analisis.md)); si falla, sirve el artefacto
  anterior y lo dice.
- La web y el escritorio lo cargan como cargan el resto: al arrancar, al refrescar y desde el
  proyecto guardado. Sin `lint.json` no hay lint, y no pasa nada.

### 3. El riesgo gana una cuarta señal

El riesgo deja de ser solo del snapshot cuando hay lint: pasa a ser una función de
**(snapshot, lint)**. La cuenta vive una vez, en `@codarch/metrics`, y la comparten el mapa, el MCP
y la captura:

- **Señal por fichero**: `errors + 0.25 × warnings`. Es deuda, no recuento: un error pesa cuatro
  avisos y un `info` no pesa.
- **Normalización**: por el p95 del proyecto, como complejidad, churn y tamaño.
- **Pesos**: con lint, complejidad 0,40 · churn 0,256 · tamaño 0,144 · lint 0,20; sin lint, los tres
  de siempre —0,50 · 0,32 · 0,18— renormalizados. El peso de una señal ausente es 0, igual que hoy
  con churn en un repo sin git.
- **El desglose dice qué señales entraron.** La ficha del fichero ya explica el riesgo por partes; la
  cuarta parte se llama **Lint** y lleva su valor, su p95 y su peso.

Esto **enmienda el [ADR 0008](0001-0010/0008-diseno-mapa-2d.md)** en un punto: el riesgo puede
depender de una herramienta. Se acepta porque el lint es justo la señal que faltaba para explicar
dónde duele, y porque el desglose nunca deja al lector adivinar qué se midió. Un consumidor sin
artefacto —la acción, un `cc.json` suelto— sigue dando el riesgo de tres señales y lo dice.

### 4. Dos vistas, en las fichas que ya existen

No hay una cuarta entrada en la barra: el lint es una propiedad del fichero y de la carpeta.

- **Fichero**: sección **Lint** después de Métricas, con errores y avisos, las reglas agrupadas por
  severidad y la línea de cada mensaje. Un clic lleva al código, como las reglas de dominio.
- **Carpeta**: sección **Lint** con la cuenta por severidad, las reglas que más se repiten y los
  ficheros dentro de cada una. Es la misma agregación que usará el MCP.
- **La entrada de la barra** lleva un punto con la cuenta cuando el sujeto tiene lint, como el punto
  de violaciones nuevas.
- **Cambios no lo absorbe**: lint no es un cambio del árbol. Se queda donde está la pregunta, que es
  el fichero y la carpeta.

### 5. Una lente llamada Linter

El selector de color gana **Linter** cuando hay artefacto. Pinta cada fichero por su **cantidad
ponderada** (`errors + 0.25 × warnings`), con el mismo tipo de degradado que el calor: un fichero con
un aviso no es un fichero con cuarenta. La leyenda lleva la escala y la cuenta total de errores y
avisos; el resto de lentes no cambia.

Sin `lint.json`, la opción no se ofrece y el aviso de color lo explica, como con la lente de
migración sin snapshot. La lente no toca el área: el tamaño sigue diciendo el tamaño.

## Consecuencias

- El mismo commit puede dar riesgos distintos en dos superficies si una tiene lint y la otra no; el
  desglose lo dice. Es la misma regla que ya vale para churn en un repo sin git.
- El artefacto puede quedarse viejo: es un fichero, como `report.json`. El comando lo dice y `serve`
  lo refresca; la app no lo esconde.
- Las versiones de las herramientas cambian resultados: por eso el lint tiene checksum propio y no
  entra en el del código.
- El MCP gana lint por fichero y por carpeta y lo usa en el riesgo cuando lo recibe; sin artefacto
  responde `available: false`, como con el reporte.
- La acción puede ejecutar `codarch lint` antes del diff y bloquear con `--fail-on errors`; no es
  parte de esta fase.
- Rendimiento: el comando lanza procesos, y el live lo repite tras un cambio. La v1 los lanza en
  paralelo; el siguiente paso es no repetir herramientas cuyo conjunto de ficheros no cambió.

## Alternativas descartadas

- **El lint dentro de `cc.json`.** Cambia el checksum con la herramienta instalada y obliga a
  regenerar el snapshot al tocar la configuración del linter.
- **El lint dentro de `report.json`.** El reporte compara dos snapshots; el lint mide un árbol. Son
  dos preguntas y dos ciclos de vida.
- **Ejecutar ESLint dentro de `analyze`.** Convierte un análisis determinista y barato en una
  dependencia de `node_modules` y de media docena de configuraciones.
- **Una cuarta pestaña «Lint».** El lint no es una escala nueva: es del fichero o de la carpeta, y
  esas dos puertas ya existen ([ADR 0069](0061-0070/0069-dos-pestanas.md)).
- **Colorear por peor severidad.** Un fichero con un aviso y otro con cuarenta se ven igual; la
  cantidad es la información que el mapa puede dar de un vistazo.
- **No tocar el riesgo.** Es la opción conservadora, pero deja fuera la señal que el producto pidió
  integrar; el desglose por señales hace el cambio explícito.

## Hoja de ruta

Fase **M65 — El lint, en el mapa**.

- ✅ El artefacto `lint.json`: formato, normalizador de `eslint-json` y `oxlint-json`, checksum y
  tests de determinismo. Vive en `packages/lint`, con entrada de navegador para leerlo sin los
  normalizadores de Node.
- ✅ `codarch lint`: `.codarch.yml` gana `lint:`, procesos en paralelo, fallo blando y `--fail-on`.
- ✅ `serve`, la web y el escritorio cargan el lint; el proyecto guardado lo lleva.
- ⬜ La cuarta señal del riesgo en `@codarch/metrics`, el render, el MCP y la captura, con su
  desglose.
- ⬜ Las fichas de fichero y de carpeta, con la agregación compartida, y el punto en la barra.
- ⬜ La lente **Linter**, su leyenda y el aviso sin artefacto.
- ⬜ Otras herramientas por lenguaje: ruff, checkstyle, `go vet` y los analizadores de .NET.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
