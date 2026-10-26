---
title: "Actualizaciones"
description: "Cómo se actualiza CodArch en cada forma de instalación: npm, Docker y la app de escritorio."
section: producto
sidebar:
  label: "Actualizaciones"
  order: 30
---

## CLI (npm)

```sh
codarch version --check   # pregunta a npm si hay una versión más nueva
npm i -g codarch@latest   # instala la última
```

`codarch version --check` consulta el registro de npm y te dice si hay una versión nueva; sale con 1 solo si no pudo consultar.

## Docker

La etiqueta `latest` se mueve con cada release; la versión exacta (`0.3.36`, …) no cambia nunca.

```sh
docker pull ghcr.io/jaminsmoke/codarch-web:latest
```

Después vuelve a lanzar el contenedor. Si quieres builds reproducibles, fija una versión exacta
y cámbiala a mano. Con Compose desde un clon: `git pull` y `docker compose up --build`.

## App de escritorio

La app se actualiza sola en Windows y Linux. Al arrancar consulta las releases de GitHub, elige la
versión más alta (incluidas las prereleases) y descarga el instalador en segundo plano. La ventana
principal no muestra ningún aviso: el estado está en **Ajustes › Actualizaciones**, con
«Comprobar ahora» y el botón **«Actualizar y reiniciar»**.

![Ajustes › Actualizaciones con una versión nueva disponible y el botón «Actualizar y reiniciar»](../images/escritorio-actualizacion.png)

Desde la 0.3.37, al pulsar «Actualizar y reiniciar» la app instala la versión nueva y se vuelve a
abrir sola. Si no lo pulsas, la actualización se aplica al cerrar la app.

| Instalación | Cómo se aplica |
| --- | --- |
| Windows (`.exe`) | Instalador NSIS con descarga diferencial. |
| Linux AppImage | Reemplaza el AppImage en tu carpeta de usuario, sin permisos. |
| Linux `.deb` | Se instala con `dpkg`: **el sistema te pide la contraseña de administrador**. |

macOS no tiene autoactualización: no hay instalador firmado todavía.
