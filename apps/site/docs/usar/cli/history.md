---
title: "codarch history"
description: "Lista las fotos guardadas del repositorio y compara dos de ellas."
section: usar
sidebar:
  label: "history"
  order: 26
---

Lista las fotos guardadas del repositorio y compara dos de ellas.

## Uso

```sh
codarch history [ruta] [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `--from <foto>` | Foto base: un trozo de su fecha o el inicio de su checksum. |
| `--to <foto>` | Foto contra la que comparar. |
| `-o, --out <file>` | Escribe el reporte JSON del diff (con `--from`/`--to`). |
| `--json` | Salida machine-readable. |
| `-h, --help` | Ayuda. |

## Salida

Las fotos se guardan con `codarch analyze . --history` en `.codarch-history/`. Sin `--from`/`--to` imprime una tabla (fecha, ficheros, rloc, calor, checksum) y los ficheros más tocados de la última foto; con `--json`, el índice completo. Con `--from` y `--to` compara las dos fotos como `diff`.

## Ejemplos

```sh
codarch analyze . --history
codarch history
codarch history --from 2026-10-01 --to 0dca58ac -o report.json
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Listado o comparación hecha (también si no hay fotos). |
| `1` | Carpeta inexistente, foto no encontrada u opción inválida. |
