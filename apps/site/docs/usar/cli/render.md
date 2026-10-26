---
title: "codarch render"
description: "Publica la webapp estática con un snapshot dentro, lista para servir."
section: producto
sidebar:
  label: "render"
  order: 23
---

Publica la webapp estática con un snapshot dentro, lista para servir.

## Uso

```sh
codarch render <fichero.cc.json[.gz]> [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `-o, --out <dir>` | Carpeta de salida. Por defecto, junto al cc.json. |
| `-h, --help` | Ayuda. |

## Salida

Copia la webapp a la carpeta de salida con el snapshot en `data/snapshot.cc.json`. Imprime el fichero, la salida, el comando para servirla (`npx serve "<salida>"`), el número de ficheros, el proyecto y el tiempo. Sirve para publicar el mapa en cualquier hosting estático.

## Ejemplos

```sh
codarch render .codarch/snapshot.cc.json -o publico
npx serve publico
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | App publicada. |
| `1` | Falta el fichero o no es cc.json válido, no se encuentra el build web o no se pudo escribir la salida. |
