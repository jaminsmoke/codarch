---
title: "codarch inspect"
description: "Resume un snapshot cc.json en la terminal o en JSON."
section: usar
sidebar:
  label: "inspect"
  order: 22
---

Resume un snapshot cc.json en la terminal o en JSON.

## Uso

```sh
codarch inspect <fichero.cc.json[.gz]> [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `--json` | Salida machine-readable. |
| `--top <n>` | Ficheros en el ranking. Por defecto 5. |
| `--metric <nombre>` | Métrica del ranking. Por defecto `rloc`. |
| `-h, --help` | Ayuda. |
| `-v, --version` | Versión. |

## Salida

Lee el snapshot (también `.gz`) y muestra sus metadatos, estadísticas y los N ficheros con más valor en la métrica. Con `--json` imprime `{ file, meta, stats, metric, top }`.

## Ejemplos

```sh
codarch inspect .codarch/snapshot.cc.json
codarch inspect .codarch/snapshot.cc.json --top 10 --metric maxComplexity --json
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Resumen impreso. |
| `1` | Falta el fichero, no se puede leer, no es cc.json válido o la opción es inválida. |
