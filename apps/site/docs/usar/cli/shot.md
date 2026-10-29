---
title: "codarch shot"
description: "Guarda el mapa en un PNG con el área y el color que elijas, para verlo sin abrir la app."
section: usar
sidebar:
  label: "shot"
  order: 28
---

Guarda el mapa en un PNG con el área y el color que elijas, para verlo sin abrir la app.

## Uso

```sh
codarch shot <fichero.cc.json[.gz]> [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `--area <métrica>` | Métrica que decide el área de cada caja. Por defecto `rloc`, o la de mayor cobertura. |
| `--color <modo>` | `risk`, `structure` o el nombre de una métrica (`churn` vale como alias de `number_of_commits`). Por defecto `risk`. |
| `-o, --out <file>` | Escribe el PNG en esa ruta en vez de ocupar una ranura. |
| `--width <px>` | Ancho de la captura, entre 160 y 4096. Por defecto 1400. |
| `--height <px>` | Alto de la captura, entre 160 y 4096. Por defecto 900. |
| `--json` | Salida machine-readable. |
| `-h, --help` | Ayuda. |

## Salida

Escribe el PNG en `.codarch/shots/`. Hay **dos ranuras**, `map-1.png` y `map-2.png`: la captura ocupa la libre y, con las dos ocupadas, pisa la más antigua por fecha de modificación. Son dos y no veinte porque lo que se quiere comparar es con la anterior, y una carpeta de capturas con fecha en el nombre crece sola.

Imprime la ruta, la ranura, el área, el color, el tamaño y el resumen —la escala de color y las celdas más grandes—. La imagen es geometría y color, sin texto: los nombres van en el resumen, que es también lo que devuelve la tool `map_screenshot` del MCP.

Un área o un color que el snapshot no trae no pintan un mapa vacío: el comando falla con el mensaje de la métrica que falta. La captura es determinista: mismo snapshot, mismo área, mismo color y mismo tamaño dan los mismos bytes.

## Ejemplos

```sh
codarch shot .codarch/snapshot.cc.json
codarch shot .codarch/snapshot.cc.json --area maxComplexity --color rloc --width 2000
codarch shot .codarch/snapshot.cc.json -o mapa.png
codarch shot .codarch/snapshot.cc.json --color churn --json
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Captura escrita. |
| `1` | Falta el fichero o no es cc.json válido, la métrica de área o el color no existen en el snapshot, o no se pudo escribir el PNG. |
