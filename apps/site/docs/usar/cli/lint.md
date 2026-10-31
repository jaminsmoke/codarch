---
title: "codarch lint"
description: "Lee el lint que el proyecto ya tiene —su configuración y su herramienta— y escribe el artefacto .codarch/lint.repmod.json."
section: usar
sidebar:
  label: "lint"
  order: 29
---

`codarch lint` no trae un linter ni escribe configuración: **lee el lint que el proyecto ya tiene** y escribe un artefacto con lo que dijo. Si el repo no tiene lint, no se lo inventa: recomienda el mínimo y no escribe artefacto. El lint no entra en el snapshot —depende de las herramientas instaladas y de su configuración—, así que tiene su propio fichero, su propio checksum y su propio ciclo de vida. Quien lo mide en el uso normal es [`codarch analyze`](analyze.md), en la misma pasada que las demás lentes; este comando es para medirlo suelto, sin mapa.

## Qué detecta

| Sistema | Configuración que busca | Qué se lee |
| --- | --- | --- |
| **ESLint** | `eslint.config.*`, `.eslintrc*`, `eslintConfig` en `package.json` | `eslint --format json` y sus reglas activas con `--print-config`. |
| **oxlint** | `oxlint.json`, `.oxlintrc.json`, `.oxlintrc` | `oxlint --format json` y las reglas de su JSON. |
| **Biome** | `biome.json`, `biome.jsonc` | `biome lint --reporter=json`; sus reglas activas no se enumeran todavía. |
| **Ruff** | `ruff.toml`, `.ruff.toml`, `[tool.ruff]` en `pyproject.toml` | `ruff check --output-format=json`, con el `ruff` del PATH. |
| **Checkstyle** | `checkstyle.xml`, `config/checkstyle/checkstyle.xml`, el plugin en `build.gradle` | `checkstyle -c <config> -f xml .`, con el `checkstyle` del PATH. El plugin de Gradle no dice qué XML usa: ahí no se mide. |
| **go vet** | `go.mod` | `go vet ./...`, con el `go vet` del PATH. |
| **.NET** | `*.csproj`, `*.sln` | `dotnet format <solución|proyecto> analyzers --verify-no-changes --severity info`, con el SDK del PATH; la solución manda sobre un proyecto suelto. |

Un sistema entra si tiene su configuración **o** si su herramienta está instalada. Si hay configuración y no hay binario, el comando lo dice: **no se completa con `npx`**, porque descargar una versión que el repo no eligió sería inventar la medida. Las herramientas corren con el binario del proyecto (`node_modules/…`) —Ruff y Checkstyle, que no viven ahí, con los que el proyecto tenga en el PATH— y su propia configuración.

Biome no da línea ni columna en su JSON —su `span` son desplazamientos de bytes—, así que sus mensajes entran sin posición en vez de calcularla a mano. Ruff no da severidad: todos sus hallazgos cuentan como error, que es como los trata al salir con código distinto de cero.

ESLint y oxlint dan el mismo mensaje normalizado: regla, severidad, línea, columna y texto. Las rutas absolutas se hacen relativas a la raíz y las que caen fuera del repo se descartan. Si dos herramientas dicen exactamente lo mismo del mismo sitio, se cuenta una vez.

## Reglas activas

- **ESLint** se resuelve con `eslint --print-config <fichero>`, que lee la configuración real —flat config, plugins y overrides— en vez de interpretar el fichero a mano.
- **oxlint** se lee de su JSON; sin configuración corre sus reglas de corrección por defecto y el artefacto dice que no se enumeran.
- **Biome** lee de su config las reglas que escribe, con su grupo y su nivel (`style/useConst`). Las de `recommended` dependen de la versión de Biome y no se enumeran: la nota del sistema lo dice.
- **Ruff** enumera sus reglas, no sus selectores: lee `select` y `extend-select` (menos `ignore` y `extend-ignore`), pide el catálogo a su propia versión con `ruff rule --all --output-format=json` y expande por prefijo con la especificidad de Ruff: gana el selector más concreto y, si empatan, el ignorado. Sin `select`, corren las de por defecto y no se enumeran; sin catálogo, se listan los selectores y se dice. El catálogo se guarda en `.codarch/lint-cache.json` con la versión de Ruff que lo dio: solo se vuelve a pedir cuando actualizas Ruff. No es parte del artefacto ni del checksum, y no se crea `.codarch/` para escribirlo.
- **Checkstyle** lee los `<module name="…">` de su XML, sin contenedores (`Checker`, `TreeWalker`) ni filtros de supresión. Su config no da severidad a cada módulo: la trae cada hallazgo.
- **go vet** y los **analizadores de .NET** no enumeran sus reglas: van con la versión de Go o con el SDK y `AnalysisLevel`. Los hallazgos de `go vet` entran como `go vet` —su texto no firma el analizador—; los de .NET llevan su código (`CA1822`, `CS0168`). Una lista plausible sería peor que un hueco.

## El override opcional

El bloque `lint:` de `.codarch.yml` es para los comandos que la detección no cubre. Si está, **manda** y se ejecuta tal cual:

```yaml
lint:
  - name: eslint
    command: node node_modules/eslint/bin/eslint.js . --format json
    format: eslint-json
```

Cada entrada lleva `name`, `command` y `format` (`eslint-json`, `oxlint-json`, `biome-json`, `ruff-json`, `checkstyle-xml`, `govet-text` o `dotnet-text`). Un bloque mal formado es un error en vez de una adivinanza.

## Uso

```sh
codarch lint [ruta] [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `-o, --out <dir>` | Carpeta del artefacto. Por defecto `<ruta>/.codarch`. |
| `--config <file>` | YAML con el override. Por defecto `.codarch.yml` si existe. |
| `--no-config` | Ignora el override del YAML; usa el lint del proyecto. |
| `--no-detect` | No detecta el lint del proyecto. |
| `--fail-on <modo>` | `never`, `errors` o `warnings`. Por defecto `never`. |
| `-h, --help` | Ayuda. |
| `-v, --version` | Versión. |

## Salida

Escribe `lint.repmod.json` en la carpeta de salida. Si crea `.codarch/` en la raíz, añade `.codarch/` al `.gitignore`; si la carpeta ya existía, no lo toca. Un `.codarch/lint.json` o `lint.cc.json` de una versión anterior no se lee: la hoja dirá «sin medir» hasta que se vuelva a analizar.

```json
{
  "schemaVersion": "1.2",
  "meta": {
    "checksum": "…",
    "tools": ["eslint"],
    "systems": [
      {
        "name": "eslint",
        "config": "eslint.config.js",
        "rules": [{ "id": "no-console", "severity": "warn" }]
      }
    ]
  },
  "files": {
    "src/a.ts": {
      "errors": 0,
      "warnings": 1,
      "messages": [
        { "rule": "no-console", "severity": "warn", "line": 1, "column": 1, "message": "Unexpected console" }
      ]
    }
  },
  "summary": { "files": 1, "errors": 0, "warnings": 1, "messages": 1, "measured": 1 }
}
```

`meta.systems` dice qué lint **tiene** el proyecto —con su configuración y sus reglas activas— y `meta.tools` cuáles midieron de verdad. Un artefacto `1.0` se sigue leyendo: sus herramientas pasan a ser los sistemas, sin configuración.

`summary.measured` es lo que separa «medido y limpio» de «no se midió»: cuenta los ficheros que la herramienta miró, **incluidos los limpios**, que no aparecen en `files`. `meta.tree` es el checksum del snapshot que se midió; lo rellena quien analiza —`codarch analyze` y, en el live, `serve`—. Este comando suelto no analiza el repo, así que por sí solo no escribe `tree`: la app no puede comparar y no lo finge.

Ficheros por ruta relativa, mensajes ordenados por línea y columna, y un checksum que no cambia si la salida de las herramientas no cambia. **Un artefacto sin mensajes es un repo medido y limpio**; que no haya artefacto significa que nadie midió, que es otra cosa.

El resumen cuenta la raíz, la fuente, el artefacto, lo que hizo cada herramienta y cada sistema con su configuración. Los **ficheros con hallazgos** son los que tienen algún mensaje, y se enseñan **de los medidos** —`3 ficheros con hallazgos de 494 medidos`—: eso es lo que distingue un repo limpio de uno sin medir. El recuento de reglas y hallazgos es el mismo que leen la app y el MCP, y `--fail-on` decide con esa misma cuenta, no con el resumen que declare el fichero.

![Salida de `codarch lint .` en la terminal](../../images/cli-lint.png)

## Fallo blando

Las herramientas se lanzan en paralelo y el comando espera a todas. Una que no está o que revienta se avisa y las demás siguen: el artefacto se escribe con lo que sí se midió, y solo con esas herramientas.

Un linter con hallazgos sale con código distinto de cero, y eso **no** es un fallo si dejó su JSON. Por eso el comando no bloquea por defecto: `--fail-on errors` es lo que se usa en CI, y `--fail-on warnings` cuenta errores y avisos.

## Si el proyecto no tiene lint

No escribe configuración ni lanza un linter que el repo no tiene: el comando sale con `1` y recomienda el mínimo por lenguaje.

| Lenguaje | Mínimo recomendable |
| --- | --- |
| TypeScript y JavaScript | ESLint + `typescript-eslint` en `recommended`. |
| Python | Ruff con `select = ["E", "F"]`. |
| Go | `go vet ./...` y staticcheck en CI. |
| Java | Checkstyle con `google_checks.xml`. |
| C# | Analizadores de .NET con `AnalysisLevel=latest-recommended`. |

## Ejemplos

```sh
codarch lint .
codarch lint . --fail-on errors
codarch lint . --no-detect --config .codarch.yml
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Artefacto escrito. No dice que el código esté limpio: eso lo dicen sus cuentas. |
| `1` | Configuración inválida, ninguna herramienta midió (incluido «el proyecto no tiene lint»), no se pudo escribir el artefacto, o `--fail-on` encontró lo que buscaba. |

:::note[Para saber más]
Las decisiones detrás de esta página: [ADR 0096 — El lint es del proyecto](../desarrollo/adr/0091-0100/0096-el-lint-es-del-proyecto.md), [ADR 0099 — El lint se mide al analizar](../desarrollo/adr/0091-0100/0099-el-lint-se-mide-al-analizar.md) y [ADR 0094 — El lint, en el mapa](../desarrollo/adr/0091-0100/0094-el-lint-en-el-mapa.md). La app enseña los sistemas y sus reglas en **Reglas**, en las hojas de proyecto, carpeta y fichero.
:::
