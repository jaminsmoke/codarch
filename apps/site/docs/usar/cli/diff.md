---
title: "codarch diff"
description: "Compara dos snapshots y, si se pide, falla con ciclos, violaciones o hotspots nuevos."
section: producto
sidebar:
  label: "diff"
  order: 24
---

Compara dos snapshots y, si se pide, falla con ciclos, violaciones o hotspots nuevos.

## Uso

```sh
codarch diff <base.cc.json[.gz]> <head.cc.json[.gz]> [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `-o, --out <file>` | Escribe el reporte JSON. Sin esto no se escribe fichero. |
| `--top <n>` | Hotspots en el reporte. Por defecto 10. |
| `--hotspot-metric <métrica>` | Por defecto `maxComplexity`, luego `rloc`. |
| `--config <file>` | Reglas YAML. Por defecto `.codarch.yml` si existe. |
| `--no-config` | No carga reglas. |
| `--fail-on <modo>` | `none` · `cycles` · `violations` · `hotspots` · `any`. Por defecto `none`. |
| `-h, --help` | Ayuda. |

## Salida

Imprime el resumen del cambio entre base y head (ficheros, ciclos introducidos, hotspots, violaciones de reglas). Con `-o` escribe el `report.json` que leen la webapp, el MCP y la GitHub Action.

## Ejemplos

```sh
codarch diff base.cc.json head.cc.json -o report.json --fail-on cycles
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Comparación hecha y el gate (si lo hay) pasa. |
| `1` | Hace falta exactamente dos snapshots, alguno es inválido, opción o `.codarch.yml` inválidos. |
| `2` | Gate fallido: el modo de `--fail-on` encontró ciclos nuevos, hotspots o violaciones nuevas. |
