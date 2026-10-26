---
title: "codarch serve"
description: "Analiza un repositorio y sirve la webapp en local, refrescándola al cambiar ficheros."
section: producto
sidebar:
  label: "serve"
  order: 25
---

Analiza un repositorio y sirve la webapp en local, refrescándola al cambiar ficheros.

## Uso

```sh
codarch serve [ruta] [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `-p, --port <n>` | Puerto local (1–65535). Por defecto 4173. |
| `--host <host>` | Interfaz. Por defecto `127.0.0.1`. |
| `--watch` | Reanaliza al cambiar ficheros y refresca la app por SSE. Por defecto. |
| `--no-watch` | Solo analiza al arrancar. |
| `--no-web` | Modo API: sirve `/data/*` sin la app (para Vite u otro frontend). |
| `-h, --help` | Ayuda. |

## Salida

Imprime la URL y se queda en marcha hasta Ctrl+C. Además de la app expone los datos en `/data/` (`snapshot.cc.json`, `meta.json`, `report.json`, `head-report.json`, `history.json`, …). Sin ruta analiza la carpeta actual.

## Ejemplos

```sh
codarch serve .
codarch serve . --port 8080 --no-watch
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Servidor parado con normalidad. |
| `1` | Opción inválida, ruta inexistente o no permitida, `.codarch.yml` inválido, build web no encontrado o el puerto no se pudo abrir. |
