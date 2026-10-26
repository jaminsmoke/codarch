---
title: Cada componente, su versión
date: "2026-10-25"
category: chore
verdict: adr
---

**Qué era**: una sola versión para todo. `versions.json` tenía `product` y el CLI, el escritorio, la web y el MCP la compartían. Subir una tanda obligaba a decidir un número global, y el CLI solo se publicaba a mano: npm seguía en `0.3.1-alpha.3` mientras el producto iba por `0.3.20`.

**Qué cambió**: `versions.json` guarda `engine`, `cli`, `desktop`, `web`, `mcp` y `docker`; cada `package.json` lleva la suya y `@codarch/versions` exporta una constante por componente. Un coordinador, después de CI verde en `main`, mira el diff desde la última release, calcula el impacto por el **grafo de dependencias** (no por carpetas), sube el parche de lo afectado en un solo commit y lanza los canales: npm, release de escritorio y Docker. La web viaja dentro del CLI, así que un cambio de web también sube el CLI. Los `minor`/`major` siguen a mano con `npm run release -- --cli minor`. Los ajustes estrenan **Componentes** con la versión y la forma de actualizar cada pieza.

**Números**: seis componentes en vez de un número global. Un cambio en `apps/cli` sube CLI y Docker; uno en el escritorio solo el escritorio; uno en `packages/ui` sube motor, CLI, escritorio, web y Docker, pero no MCP. La primera pasada pone npm al día, y el primer parche automático es `0.3.21`. El checksum y los formatos no cambian.

**Veredicto**: [ADR 0065](../../adr/0061-0070/0065-cada-componente-su-version.md), hecho. Quedan en su hoja de ruta el aviso de actualización del CLI dentro de las apps y separar la web del paquete del CLI si algún día deja de viajar dentro.
