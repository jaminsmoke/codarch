---
title: "Webapp"
description: "El mapa en el navegador: viene con el CLI y se abre con codarch serve, o sola con Docker."
section: usar
sidebar:
  label: "Webapp"
  order: 40
---

La webapp es el mapa en el navegador: treemap, búsqueda, inspector, dependencias, vista de PR,
historial y las lentes de estructura, riesgo y métrica. **No analiza sola en el navegador**: analiza a
través de `codarch serve`, que lee el repositorio del disco y le pasa el snapshot.

## Dos formas de abrirla

### Con el CLI (la misma instalación)

`npm i -g codarch` ya trae la webapp. Se abre con:

```bash
codarch serve .
```

`serve` no es otra forma de instalar: sirve la webapp que viene con el CLI, en local, y reanaliza al
guardar. Su versión es la del CLI. Ver [`codarch serve`](cli/serve.md).

### Sola, con Docker

Sin instalar Node, con la imagen publicada y tu repo montado en solo lectura:

```bash
docker run --rm -p 127.0.0.1:4173:4173 \
  -v "$PWD":/workspace:ro \
  ghcr.io/jaminsmoke/codarch-web:latest
```

Abre `http://localhost:4173`. Dentro corre el mismo `codarch serve` sobre `/workspace`; el
contenedor escucha solo en loopback y no escribe en el repo (ADR 0044).

Si has clonado el repositorio de CodArch, también puedes construirla y arrancarla desde él:

```bash
docker compose up --build
CODARCH_REPO=/ruta/al/repo docker compose up --build   # para mirar otro repo
```

> 📸 **Captura pendiente (webapp-docker):** la webapp en `http://localhost:4173` servida por el
> contenedor `ghcr.io/jaminsmoke/codarch-web:latest`, con un repo montado y la lente **Estructura**.

## Qué guarda

Las preferencias (métrica de área, modo de color) viven en el navegador; el estado del repo, en su
carpeta `.codarch/`. La webapp no sube nada a ningún servidor.

## Un mapa estático

`codarch render <snapshot> -o <carpeta>` publica la misma interfaz como sitio estático con el snapshot
en `data/`: se puede servir desde Pages o cualquier carpeta. Ver [`codarch render`](cli/render.md).
