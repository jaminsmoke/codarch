---
title: ADR 0044 — La app web en un contenedor local
description: "La app web del mapa ya viaja dentro del CLI: codarch serve . analiza el repositorio, sirve la web y la reanaliza al guardar. Para usarla hay que tener Node 22, npm y el…"
section: adr
status: aceptado
date: "2026-10-23"
sidebar:
  label: La app web en un contenedor local
  order: 44
---

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

La app web del mapa ya viaja dentro del CLI: `codarch serve .` analiza el repositorio, sirve la web
y la reanaliza al guardar. Para usarla hay que tener Node 22, npm y el CLI instalado. Es razonable
para quien ya trabaja en el repo, pero no para quien solo quiere abrir el mapa en su máquina sin
tocar el entorno.

Docker resuelve esa instalación: una imagen reproducible, un puerto local y el repositorio montado.
No cambia el producto ni el modelo: el análisis, el checksum y la web siguen siendo los mismos. La
imagen **no** es un backend remoto; es la misma app de un solo usuario, metida en una caja.

## Decisión

### 1. La imagen ejecuta el CLI que ya existe

`Dockerfile` es multi-etapa:

1. **build** parte de `node:22-bookworm`, instala las herramientas nativas que necesita
   `tree-sitter`, compila la web y el CLI, y deja el paquete del CLI en `/opt/codarch`.
2. **runtime** parte de `node:22-bookworm-slim`, copia solo `/opt/codarch` y arranca
   `node /opt/codarch/node_modules/codarch/index.js serve /workspace`.

No se crea un servidor nuevo ni se duplica la lógica de `serve`: la imagen es una forma de instalar
lo que ya está publicado en npm. La web viaja dentro del paquete del CLI, como en el resto de
canales.

### 2. El repositorio se monta, no se copia

`docker-compose.yml` monta `${CODARCH_REPO:-.}` en `/workspace` en **solo lectura**. La app analiza
ese árbol y no escribe en él; el historial y los reportes que ya existan se leen de `.codarch/`.

El puerto se publica en `127.0.0.1:4173:4173`, no en todas las interfaces. Dentro del contenedor el
servidor escucha en `0.0.0.0` porque es la única forma de que Docker lo alcance; fuera, solo queda
en la máquina.

### 3. Una imagen, dos formas de conseguirla

- **Local:** `docker compose up --build` compila desde el repo. Sirve para probar cambios y no
  depende de ninguna publicación.
- **Publicada:** el workflow `docker.yml` publica `ghcr.io/jaminsmoke/codarch-web` en cada push a
  `main`, con `latest` y la versión del producto. La etiqueta de versión permite fijar una imagen
  concreta; `latest` sigue el canal de `main`.

El workflow construye también en los pull request, sin publicar. Así el `Dockerfile` no se queda
sin probar.

### 4. La versión es la del producto

La imagen no tiene versión propia: usa la de `versions.json` y la del CLI. El checksum no cambia
por ejecutarla dentro de Docker.

## Consecuencias

- Instalar la app web local pasa a ser `docker compose up --build` y abrir
  `http://127.0.0.1:4173`.
- La imagen final no lleva compiladores, Electron ni el escritorio; solo Node, el CLI y la web.
- El montaje en solo lectura evita que el contenedor toque el repositorio del usuario.
- El puerto queda en loopback por defecto; publicarlo fuera es una decisión explícita.
- La primera construcción tarda más porque compila `tree-sitter`; las siguientes reutilizan la caché
  de Docker y la caché de GitHub Actions.
- La imagen de GHCR puede ser privada por defecto; para que cualquiera la descargue hay que hacer
  pública la package en GitHub.

## Alternativas descartadas

- **Servir solo los ficheros estáticos con nginx:** la app necesita `/data/*` y SSE; sin el CLI no
  hay mapa.
- **Un backend remoto dentro del contenedor:** choca con el no objetivo de v1; el contenedor es
  local y de un solo usuario.
- **Copiar el repositorio dentro de la imagen:** obligaría a reconstruir la imagen para cada repo y
  separaría los datos del usuario de la app.
- **Publicar en todas las interfaces:** convierte una herramienta local en un servicio de red sin
  pedirlo.

## Hoja de ruta

### M27 — La app web en Docker

- [x] `Dockerfile` multi-etapa, `.dockerignore` y `docker-compose.yml` con el repo montado en solo
  lectura y el puerto en loopback.
- [x] El README y `AGENTS.md` explican el arranque local y la publicación.
- [x] El workflow `docker.yml` construye en PR y publica en GHCR al entrar en `main`.
- [x] Probar la imagen publicada contra el repo: el smoke test descarga la imagen de GHCR, la
  arranca con el repo montado y comprueba `/data/meta.json` con 230 ficheros y su checksum.

El detalle de lo hecho está en el [changelog](0044-la-web-en-docker.changelog.md).
