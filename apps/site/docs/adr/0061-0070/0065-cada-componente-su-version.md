---
title: ADR 0065 — Cada componente lleva su versión
description: "El producto deja de tener una sola versión: CLI, escritorio, web, MCP y Docker avanzan por su cuenta, con el motor compartido y el impacto calculado por dependencias."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: Cada componente lleva su versión
  order: 65
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

Desde el ADR 0032 (y luego el ADR 0041) el producto tiene **una** versión: la de
la raíz, que se copia al CLI, al escritorio, a la web y al MCP. El ADR 0042 la
publica: una subida de versión puede construir el escritorio y publicar el CLI
aunque solo haya cambiado uno de los dos, y un push que no sube versión no
publica nada.

Ese diseño dejó el canal a medias: el CLI solo se publica con
`workflow_dispatch`, la versión se sube a mano con `npm run release`, y npm se
quedó en `0.3.1-alpha.3` mientras el producto llegó a `0.3.20`. Además, cada
tramo obliga a decidir una versión global aunque el cambio sea de un solo
componente.

La petición es la contraria: **solo sube el componente que se toca**, su
workflow específico se lanza solo, y las apps enseñan el estado de cada
componente. El parche es automático; el resto se pide a mano.

El matiz importante: “el componente que se toca” no es solo su carpeta.
El escritorio, la web y el CLI comparten el **motor** (`packages/*` y
`plugins/*`). Si cambia `packages/parsers`, no vale subir solo el CLI: el
escritorio y la web llevarían un parser más nuevo con una versión que miente.
El impacto se calcula por el **grafo de dependencias**, no por rutas.

## Decisión

### 1. `versions.json` por componente

El campo `product` desaparece. En su lugar:

| Campo | Qué versiona | Dónde se ve |
|---|---|---|
| `engine` | el motor privado (`packages/*`, `plugins/*`) | ajustes, diagnóstico |
| `cli` | el paquete `codarch` de npm | `codarch --version`, npm |
| `desktop` | la app de Electron | releases de GitHub |
| `web` | la app web que viaja con el CLI | `meta.json`, Docker |
| `mcp` | el servidor MCP | `serverInfo` |
| `docker` | la imagen `codarch-web` | etiqueta de GHCR |

Los **formatos** (`ccJson`, `report`, `config`, `history`, `chainLedger`)
siguen igual y se suben a mano: son contratos, no entregas.

El manifiesto de `@codarch/versions` exporta `ENGINE_VERSION`,
`CLI_VERSION`, `DESKTOP_VERSION`, `WEB_VERSION`, `MCP_VERSION` y
`DOCKER_VERSION`. `PRODUCT_VERSION` desaparece; cada sitio importa el suyo.

Cada `package.json` lleva su versión: la raíz la del motor, y `apps/cli`,
`apps/desktop`, `apps/web` y `apps/mcp` la suya. `npm run version` comprueba
que ninguna se separa de `versions.json`.

### 2. El impacto se calcula por dependencias

Un script puro recibe los ficheros cambiados y el grafo de workspaces, y
devuelve los componentes afectados:

- **Motor**: cualquier cambio de código en `packages/*` o `plugins/*`.
- **CLI**: cambios en `apps/cli` o en cualquier paquete del motor del que
  dependa.
- **Escritorio**, **web** y **MCP**: lo mismo con sus dependencias.
- **Web → CLI**: la app web viaja dentro del paquete del CLI, así que un
  cambio de web también sube el CLI para entregarla.
- **Docker**: cuando cambia el CLI, la web o el motor.
- **Raíz** (`package.json`, `package-lock.json`, configuración de build): todos.
- **Documentación, tests y workflows**: ninguno. Un cambio de test no cambia
  lo que se entrega.

Un cambio en `packages/ui` sube escritorio, web y CLI (porque la web viaja en
el CLI), pero no MCP. Un cambio en `apps/cli` sube solo el CLI. Nadie tiene que
recordar la tabla.

### 3. El parche se sube solo, después de CI

Un **coordinador** se lanza cuando CI termina en verde en `main`:

1. Mira el diff desde el último commit de release.
2. Calcula el impacto.
3. Sube el parche de los componentes afectados en **un solo commit**
   (`chore(release): cli 0.3.21, desktop 0.3.21`).
4. Hace push y lanza los workflows de cada canal.

Un solo escritor evita que dos workflows peleen por `versions.json` y el
lock. Los workflows de canal **no** suben versiones: construyen y publican la
que ya está en el commit.

`minor` y `major` se piden a mano, por componente:

```bash
npm run release -- --cli minor
npm run release -- --desktop major
```

El coordinador reconoce un commit `chore: release …` (manual) y no vuelve a
subir nada; solo lanza la publicación del CLI, que es el único canal que no se
dispara con un push normal.

### 4. Los canales

| Canal | Workflow | Cuándo |
|---|---|---|
| npm | `publish-cli.yml` | CLI afectado; Trusted Publishing, sin OTP |
| escritorio | `desktop.yml` | escritorio afectado; release `v<desktop>` |
| web | — | viaja dentro del CLI y de Docker; se ve su versión en la app |
| Docker | `docker.yml` | CLI, web o motor; etiqueta `docker` |
| MCP | — | no se publica; se versiona para diagnóstico |

La web del proyecto (`apps/site`, los documentos) se publica con `web.yml`
cuando cambian sus ficheros, pero no lleva versión de producto: es
documentación, no una entrega.

Un push hecho con el `GITHUB_TOKEN` **no dispara** otros workflows. Por eso el
coordinador, después de empujar el commit de release, lanza explícitamente los
canales afectados. Es la única forma de que un solo commit alimente a todos sin
un token personal.

La acción de GitHub sigue usando el **pin del CLI publicado**; se actualiza
después de que npm acepte la versión.

### 5. La sección Componentes

Los ajustes ganan **Componentes**, al lado de Actualizaciones. Enseña la
versión de motor, CLI, escritorio, web, MCP y Docker, y cómo se actualiza cada
uno:

- **Escritorio**: se descarga la release y se reinicia al cerrar.
- **Web**: se recarga al publicar una versión nueva; no hay instalación local.
- **CLI**: se actualiza con `npm i -g codarch@latest`; los procesos que lo usan
  (MCP, `serve`) se reinician.
- **MCP**: lo reinicia el cliente que lo lanza.
- **Motor y Docker**: no se actualizan desde la app; viajan con el componente.

La app **no instala** el CLI global desde dentro: es pedir problemas de
permisos. Enseña la versión, el comando y el estado; la actualización es del
usuario.

### 6. Lo que no cambia

- El checksum sigue dependiendo del código, no de las versiones.
- `cc.json` sigue en 2.x y los formatos no se mueven.
- El escritorio sigue usando `electron-updater` con la release de GitHub.
- El CLI sigue publicándose con Trusted Publishing y `next`/`latest` según la
  versión.
- La web sigue siendo la misma app; solo cambia de dónde sale su número.

## Consecuencias

- Un tramo que solo toca el CLI no genera release de escritorio.
- Un cambio en el motor sí sube los componentes que lo empaquetan; es la
  verdad, no una molestia.
- npm deja de quedarse atrás: la primera pasada publica la versión actual.
- El commit de release se escribe una vez y los canales lo leen; no hay dos
  fuentes de versión.
- `versions.json` y el manifiesto cambian de forma; los scripts, los builds y
  los tests se actualizan en el mismo tramo.
- La app puede decir qué versión de cada pieza está usando sin adivinar.
- El pin de la acción se actualiza después de que npm acepte la versión; el
  repositorio público de la acción se sincroniza a mano con `sync:action`.

## Alternativas descartadas

- **Seguir con una versión de producto y publicar solo lo cambiado.** La
  versión seguiría mintiendo: el escritorio diría `0.3.21` sin haber cambiado.
- **Subir por ruta, sin mirar dependencias.** Un cambio en `packages/parsers`
  dejaría el escritorio con un motor nuevo y una versión vieja.
- **Un workflow por componente que suba su propia versión.** Varios escritores
  sobre `versions.json` y el lock; el primero que empuja gana y el resto falla.
- **Publicar en cada push sin esperar a CI.** Se publicaría código roto.
- **Un `codarch update` que instale el CLI global desde la app.** Permisos,
  procesos en marcha y dos verdades; el comando se enseña, no se ejecuta.

## Hoja de ruta

### M45 — Cada componente su versión

- [x] `versions.json` con motor y componentes; `product` fuera.
- [x] Manifiesto y builds leen la versión de su componente.
- [x] Impacto por grafo de dependencias, con tests.
- [x] Coordinador tras CI verde: parche, commit y dispatch por canal.
- [x] Publicación automática del CLI y release de escritorio solo si toca.
- [x] Docker con su propia etiqueta.
- [x] Sección **Componentes** en los ajustes de las dos apps.
- [x] `npm run release -- --<componente> minor|major` para lo manual.
- [x] Primera pasada: npm al día con la versión actual.

El registro de lo hecho vive en el [feed de la guía](/guia/).
