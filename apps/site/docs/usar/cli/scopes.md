---
title: "codarch scopes"
description: "Lista los alcances que viven por debajo de una raíz y avisa de la deriva: qué .codarch/ hay, con su checksum, su commit y su fecha."
section: usar
sidebar:
  label: "scopes"
  order: 27
---

Lista los `.codarch/` que viven por debajo de una raíz, sin abrir el snapshot entero de cada uno.

## Uso

```sh
codarch scopes [ruta] [opciones]
```

## Opciones

| Opción | Qué hace |
| --- | --- |
| `--root <ruta>` | La raíz que se mira (por defecto, la actual). |
| `--json` | Salida machine-readable. |
| `-h, --help` | Ayuda. |

## Salida

Una tabla con cada alcance, sus ficheros, su checksum, la fecha de su última foto y su estado:

- **al día**: su checksum es el mismo que cuando el padre lo vio.
- **se analizó otra vez**: su checksum cambió desde el último análisis del padre.
- **nuevo**: el padre no lo tenía en su registro.
- **ya no está**: estaba en el registro y ya no tiene snapshot.
- **ficheros más nuevos**: su snapshot es anterior a algún fichero de su carpeta, así que puede no contar lo que hay hoy.

## Cómo se llena

`codarch analyze` apunta en `.codarch/scopes.json` qué `.codarch/` vio por debajo, con su checksum,
su commit y su fecha. Lo lee hacia abajo y **no escribe** en el `.codarch/` del hijo: cada alcance lo
escribe quien analiza ese alcance. El registro es derivado y se puede borrar.

La búsqueda usa las mismas exclusiones que el análisis: una carpeta que `.gitignore` —o el alcance de
`.codarch.yml`— deja fuera no cuenta como alcance del padre.

## Ejemplos

```sh
codarch analyze .            # analiza la raíz y apunta los alcances anidados
codarch scopes               # los lista con su estado
codarch scopes --root apps   # mira los alcances que hay dentro de apps/
```

## Códigos de salida

| Código | Significado |
| --- | --- |
| `0` | Listado hecho (también si no hay alcances anidados). |
| `1` | Carpeta inexistente u opción inválida. |
