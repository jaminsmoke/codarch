---
title: "Preguntas frecuentes"
description: "Dudas habituales: qué instalar, la webapp, Docker, los instaladores sin firmar y la privacidad."
section: usar
sidebar:
  label: "Preguntas frecuentes"
  order: 90
---

## ¿Qué instalo?

Una de las tres vías de [Instalación](instalacion.md): el CLI con la webapp (`npm i -g codarch`), la
webapp sola con Docker o la app de escritorio. Las tres producen el mismo `cc.json` con el mismo checksum.

## ¿Qué lenguajes entiende?

TypeScript/JavaScript, Java, Python, Go y C#. De todos saca métricas, símbolos e imports, y los dibuja
en el mapa; el detalle está en [qué analiza `codarch analyze`](cli/analyze.md#qué-analiza). Rust y los
artefactos `.wasm`/`.node` se miden para la lente de migración, que sigue siendo JS/TS → Rust. Un
lenguaje fuera de esa lista no se analiza: sus ficheros no aparecen.

## ¿`codarch serve` instala la webapp?

No. La webapp ya viene con `npm i -g codarch`; `codarch serve` solo la abre y analiza el repo.

## ¿La webapp analiza en el navegador?

No. Analiza a través de `codarch serve`, en tu máquina o dentro del contenedor de Docker.

## ¿Necesito clonar el repo de CodArch para usar Docker?

No: basta con la imagen `ghcr.io/jaminsmoke/codarch-web:latest` y `docker run` (ver [Webapp](webapp.md)).
`docker compose up --build` es solo para quien ha clonado el repositorio.

## Windows o Linux avisan de que el instalador no está firmado

Es esperado: los instaladores van **sin firmar** porque firmarlos cuesta dinero y el proyecto está en
alpha. En Windows, SmartScreen puede decir que la app no es de un desarrollador identificado: pulsa
**Más información → Ejecutar de todas formas**. En Linux, el AppImage necesita permiso de ejecución
(`chmod +x codarch-*.AppImage`). Descarga siempre desde las
[Releases oficiales](https://github.com/jaminsmoke/codarch/releases).

## ¿Hay versión para macOS?

No. Sin firma ni notarización Gatekeeper bloquea la app y el actualizador no puede aplicarla. En macOS
usa el CLI o Docker.

## ¿CodArch sube mi código a algún sitio?

No. El análisis es local; la webapp y el contenedor escuchan solo en loopback, y el MCP es de solo
lectura y por stdio.

## ¿Por qué cambia el checksum?

Porque ha cambiado el código o la configuración que lo analiza. No depende de la fecha, la máquina ni
quién mira: el mapa del PR, el del CI y el del agente son el mismo.
