---
title: Changelog — ADR 0044
description: Lo hecho del ADR 0044, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0041-0050/0044-la-web-en-docker
sidebar:
  label: Changelog
  order: 44.5
---

Lo hecho, por orden. La hoja de ruta y lo abierto viven en el [ADR](0044-la-web-en-docker.md).

## 2026-10-23

- Nace la imagen local de la app web: `Dockerfile` multi-etapa, `.dockerignore` y
  `docker-compose.yml` con el repositorio montado en solo lectura y el puerto en loopback.
- El workflow `docker.yml` construye la imagen en los pull request y publica
  `ghcr.io/jaminsmoke/codarch-web` en `main`.
- El README explica el arranque con Compose y la alternativa de construir la imagen a mano.
- El smoke test del workflow descarga la imagen publicada, la arranca sobre el repo montado en
  solo lectura y comprueba `/data/meta.json`: 230 ficheros, checksum y `watch` activo.
