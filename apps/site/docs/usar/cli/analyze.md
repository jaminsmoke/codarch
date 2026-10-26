---
title: "codarch analyze"
description: "Analiza un repositorio y escribe el snapshot cc.json."
section: producto
sidebar:
  label: "analyze"
  order: 21
---

Analiza un repositorio y escribe el snapshot cc.json.

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

Escribe `snapshot.cc.json` en la carpeta de salida. Si crea `.codarch/` en la raíz, añade `.codarch/` al `.gitignore` (si la carpeta ya existía, no lo toca). Imprime un resumen: raíz, ruta y tamaño del snapshot, ficheros, carpetas, aristas, ciclos, imports (externos, builtins, type-only, sin resolver), migración y tiempo.

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
