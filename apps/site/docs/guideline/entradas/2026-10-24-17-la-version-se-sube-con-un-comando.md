---
title: La versión se sube con un comando
date: "2026-10-24"
category: chore
verdict: adr
---

**Qué es**: `npm run release`, un comando que calcula la siguiente versión del producto, la escribe
en todos los sitios y prepara la release. Y una regla clara para los formatos: esos no se suben
solos.

**Por qué**: subir la versión era a mano y con dudas: qué número tocaba, dónde había que escribirlo,
si la web también. Además era fácil colar cambios ajenos en el commit del bump o subir la versión
desde una rama con el árbol sucio.

**Qué cambió**: la versión es `mayor.menor.parche`; **el parche es lo normal** y va por defecto,
mientras que `menor` y `mayor` se piden a mano (`npm run release -- minor`). El comando exige `main`
y el árbol limpio, calcula la versión, ejecuta `npm run version`, commitea solo los ficheros de
versión y hace push; con `--dry-run` no toca nada y con `--no-push` se queda en local. La web lleva
la misma versión que el escritorio en su `package.json`, y `npm run version` falla si un paquete que
no se publica se pone una versión propia. Los formatos (`cc.json`, reporte, config, historial,
cadenas) siguen a mano: son contratos.

**Veredicto**: **ADR 0051**, sin fase abierta; es mantenimiento.
