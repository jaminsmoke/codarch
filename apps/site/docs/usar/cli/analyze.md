---
title: "codarch analyze"
description: "Analiza un repositorio y escribe el snapshot cc.json."
section: usar
sidebar:
  label: "analyze"
  order: 21
---

Analiza un repositorio y escribe el snapshot cc.json.

## Qué analiza

El recorrido lee las extensiones de cada lenguaje y **parsea cada una con su gramática**:

| Lenguaje | Extensiones |
| --- | --- |
| TypeScript / JavaScript | `.ts` `.tsx` `.mts` `.cts` `.js` `.jsx` `.mjs` `.cjs` |
| Java | `.java` |
| Python | `.py` |
| Go | `.go` |
| C# | `.cs` |

De todos salen las métricas del fichero (`loc`, `rloc`, `functions`, `maxComplexity`,
`maxFunctionLength`), sus símbolos con su complejidad y sus imports como aristas. Además se miden **sin
árbol**, solo para la lente de migración, Rust (`.rs`) y los artefactos `.wasm` y `.node`.

Los imports no apuntan a lo mismo en todos los lenguajes, y el análisis lo respeta:

- **TS/JS**: módulos, paquetes, alias del `tsconfig` y workspaces.
- **Java**: el fichero `a/b/C.java`, buscado por sufijo de ruta; vale igual para Maven, Gradle o un
  proyecto plano.
- **Python**: el módulo `a/b.py` o el paquete `a/b/__init__.py`, y los relativos desde el paquete del
  fichero.
- **Go**: el paquete entero —todos los `.go` de la carpeta—, con el prefijo del `go.mod`.
- **C#**: los ficheros que declaran el `namespace` del `using`, que se resuelven al final del análisis.

Un import que no se resuelve se cuenta y se lista con su línea; no se inventa una arista. Un lenguaje
que no está en la tabla no se analiza: sus ficheros no aparecen en el mapa y el resumen lo avisa si no
queda ninguno que leer.

La **lente de migración** no cambia: sigue siendo JS/TS → Rust, así que un fichero Java, Python, Go o
C# no tiene estado, deuda ni cruces.

## Uso

```sh
codarch analyze [ruta] [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `-o, --out <dir>` | Carpeta de salida. Por defecto `<ruta>/.codarch`. |
| `--ignore <patrón>` | Suma una exclusión al alcance. Repetible. |
| `--config <file>` | Alcance YAML. Por defecto `.codarch.yml` si existe. |
| `--no-config` | No lee el YAML de alcance. |
| `--project <nombre>` | Nombre del proyecto en el snapshot. |
| `--no-git` | No lee el churn del historial git. |
| `--history` | Guarda además la foto en `.codarch-history/`. |
| `-h, --help` | Ayuda. |
| `-v, --version` | Versión. |

## Salida

Escribe `snapshot.cc.json` en la carpeta de salida y, a su lado, `rest.cc.json`: el mapa de lo que no es código —documentos, configuración y assets— en su propio snapshot y con su propio checksum, así que cambiar un `.md` no mueve el del código. Si crea `.codarch/` en la raíz, añade `.codarch/` al `.gitignore` (si la carpeta ya existía, no lo toca). Imprime un resumen: raíz, ruta y tamaño de los dos snapshots, ficheros, carpetas, aristas, ciclos, imports (externos, builtins, type-only, sin resolver), migración, caché de parseo, alcances anidados y tiempo.

La **caché de parseo** queda en `.codarch/parse-cache.json` y la **lista de alcances** anidados en `.codarch/scopes.json`: son derivadas, se pueden borrar, y sirven para que el análisis que contiene a este alcance no vuelva a parsear lo que ya está parseado ([`codarch scopes`](scopes.md)).

![Salida de `codarch analyze .` en la terminal](../../images/cli-analyze.png)

## Ejemplos

```sh
codarch analyze .
codarch analyze . -o .codarch --project "Mi proyecto" --history
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Snapshot escrito. |
| `1` | Argumento u opción inválida, ruta inexistente, `.codarch.yml` inválido o no se pudo escribir la salida. |
