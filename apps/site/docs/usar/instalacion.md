---
title: "Instalación"
description: "Tres formas de instalar CodArch: el paquete de npm (CLI y webapp), la imagen Docker de la webapp y el instalador de escritorio."
section: usar
sidebar:
  label: "Instalación"
  order: 10
---

CodArch se instala de tres formas. Elige la que encaje con cómo trabajas; las tres leen tu
repositorio en local y no suben código a ningún sitio.

| Forma | Qué obtienes | Requisitos |
| --- | --- | --- |
| npm | CLI `codarch` + webapp servida con `codarch serve` | Node.js 22 o superior |
| Docker | Solo la webapp, en un contenedor | Docker |
| Escritorio | App nativa para Windows o Linux | Windows x64, o Linux x64 (.deb o AppImage) |

## 1. CLI y webapp con npm

El paquete `codarch` de npm trae el CLI y la webapp ya compilada dentro: una sola instalación.

```sh
npm i -g codarch
```

El paquete declara `"engines": { "node": ">=22" }`. Comprueba tu versión con `node --version`.

Comprueba la instalación y abre la webapp sobre un repositorio:

```sh
codarch --version
cd ruta/a/tu-repo
codarch serve .
```

`serve` analiza el repositorio, sirve la app en `http://127.0.0.1:4173` y la refresca cuando
cambian los ficheros.

![Terminal con `codarch serve .` en marcha y la webapp abierta en el navegador](../images/cli-serve.png)

Todas las opciones están en [`codarch serve`](cli/serve.md).

## 2. Solo la webapp con Docker

La imagen `ghcr.io/jaminsmoke/codarch-web` es una instalación de `codarch` con la webapp dentro.
Arranca `codarch serve /workspace --host 0.0.0.0 --port 4173`, así que solo hay que montar el
repositorio en `/workspace` y publicar el puerto 4173:

```sh
docker run --rm \
  -p 127.0.0.1:4173:4173 \
  -v "$PWD:/workspace:ro" \
  ghcr.io/jaminsmoke/codarch-web:latest
```

En PowerShell, usa `-v "${PWD}:/workspace:ro"`. Después abre `http://127.0.0.1:4173`.

- El montaje es de **solo lectura** (`:ro`): la app no escribe en tu repositorio.
- Publica el puerto solo en `127.0.0.1`: no es un servicio de red.
- La imagen trae `git` para leer el churn y el historial, y un healthcheck sobre
  `/data/meta.json`.
- Cada release publica dos etiquetas: `latest` y la versión exacta (por ejemplo `0.3.36`).

### Con Docker Compose (si has clonado el repositorio)

El `docker-compose.yml` del repositorio construye la imagen desde el código fuente. Es para quien
trabaja con un clon de CodArch; para usar la app basta con `docker run`. La variable `CODARCH_REPO`
es la ruta **del host** que se monta en `/workspace` (por defecto, la carpeta actual):

```sh
CODARCH_REPO=/ruta/a/tu-repo docker compose up --build
```

`CODARCH_REPO` solo la lee Compose; el contenedor no la usa. Con `docker run`, la ruta se indica en `-v`.

## 3. App de escritorio

Descarga el instalador de la última release en
[GitHub Releases](https://github.com/jaminsmoke/codarch/releases/latest):

| Sistema | Fichero | Notas |
| --- | --- | --- |
| Windows x64 | `codarch-<versión>-setup.exe` | Instalador NSIS, por usuario; permite elegir carpeta y crea accesos directos. |
| Linux x64 | `codarch-<versión>-amd64.deb` | Se instala en el sistema (`sudo apt install ./codarch-….deb`). |
| Linux x64 | `codarch-<versión>-x86_64.AppImage` | Sin instalación: `chmod +x` y ejecutar. |

Los instaladores **no están firmados**: Windows SmartScreen puede avisar al abrir el `.exe`
(«Más información» → «Ejecutar de todas formas»). macOS no tiene instalador todavía.

## Siguiente paso

- [Referencia del CLI](cli/analyze.md)
- [Actualizaciones](actualizaciones.md)
