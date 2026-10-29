---
title: "codarch lint"
description: "Corre las herramientas de lint que declara el repo y escribe el artefacto .codarch/lint.json."
section: usar
sidebar:
  label: "lint"
  order: 29
---

Corre las herramientas de lint que declara el repositorio y escribe un artefacto con lo que dijeron. El lint no entra en el snapshot: depende de qué herramientas tengas instaladas y de cómo estén configuradas, así que tiene su propio fichero, su propio checksum y su propio ciclo de vida.

## Qué mide

`codarch lint` no trae un linter: lanza los que el repo declare. Hoy entiende dos dialectos, y cada uno se declara con su `format`:

| `format` | Lo que se lee |
| --- | --- |
| `eslint-json` | La lista de ficheros de `eslint --format json`. |
| `oxlint-json` | Los diagnósticos de `oxlint --format json`, con o sin la envoltura `diagnostics`. |

De los dos sale el mismo mensaje normalizado: la regla, la severidad, la línea, la columna y el texto. Las rutas absolutas se hacen relativas a la raíz y las que caen fuera del repo se descartan. Si dos herramientas dicen exactamente lo mismo del mismo sitio, se cuenta una vez.

## Configuración del repo

Las herramientas viven en el bloque `lint:` de `.codarch.yml`:

```yaml
lint:
  - name: eslint
    command: npx eslint . --format json
    format: eslint-json
  - name: oxlint
    command: npx oxlint --format json .
    format: oxlint-json
```

Cada entrada lleva tres cosas: `name` —el nombre con el que sale en el artefacto y en el resumen—, `command` —el comando completo, que se ejecuta en la raíz del repo— y `format`. Sin bloque `lint:` no hay nada que medir y el comando lo dice; un bloque mal formado también, en vez de adivinar qué se quería lanzar.

## Uso

```sh
codarch lint [ruta] [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `-o, --out <dir>` | Carpeta del artefacto. Por defecto `<ruta>/.codarch`. |
| `--config <file>` | YAML con las herramientas. Por defecto `.codarch.yml` si existe. |
| `--no-config` | No lee las herramientas del YAML. |
| `--fail-on <modo>` | `never`, `errors` o `warnings`. Por defecto `never`. |
| `-h, --help` | Ayuda. |
| `-v, --version` | Versión. |

## Salida

Escribe `lint.json` en la carpeta de salida. Si crea `.codarch/` en la raíz, añade `.codarch/` al `.gitignore`; si la carpeta ya existía, no lo toca.

```json
{
  "schemaVersion": "1.0",
  "meta": { "checksum": "…", "tools": ["eslint", "oxlint"] },
  "files": {
    "src/a.ts": {
      "errors": 1,
      "warnings": 1,
      "messages": [
        { "rule": "no-var", "severity": "error", "line": 1, "column": 1, "message": "Unexpected var" }
      ]
    }
  },
  "summary": { "files": 1, "errors": 1, "warnings": 1, "messages": 2 }
}
```

Ficheros por ruta relativa, mensajes ordenados por línea y columna, y un checksum que no cambia si la salida de las herramientas no cambia. **Un artefacto sin mensajes es un repo medido y limpio**; que no haya artefacto significa que nadie midió, que es otra cosa.

El resumen cuenta la raíz, el artefacto y lo que hizo cada herramienta:

![Salida de `codarch lint .` en la terminal](../../images/cli-lint.png)

## Fallo blando

Las herramientas se lanzan en paralelo y el comando espera a todas. Una que no está o que revienta se avisa y las demás siguen: el artefacto se escribe con lo que sí se midió, y solo con esas herramientas.

Un linter con hallazgos sale con código distinto de cero, y eso **no** es un fallo si dejó su JSON. Por eso el comando no bloquea por defecto: `--fail-on errors` es lo que se usa en CI, y `--fail-on warnings` cuenta errores y avisos.

## Ejemplos

```sh
codarch lint .
codarch lint . --fail-on errors
codarch lint . -o .codarch --config .codarch.yml
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Artefacto escrito. No dice que el código esté limpio: eso lo dicen sus cuentas. |
| `1` | Configuración inválida, ninguna herramienta midió, no se pudo escribir el artefacto, o `--fail-on` encontró lo que buscaba. |

:::note[Para saber más]
Las decisiones detrás de esta página: [ADR 0094 — El lint, en el mapa](../desarrollo/adr/0091-0100/0094-el-lint-en-el-mapa.md). La app todavía no lo pinta; el fichero está listo para que lo lea.
:::
