---
title: El instalador lleva cómo actualizarse
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué es**: que el CI compruebe, antes de publicar, que el instalador lleva `latest*.yml` y
`resources/app-update.yml`.

**Por qué**: `electron-updater` lee `resources/app-update.yml` **del paquete instalado** para saber a
qué repositorio mirar. Si falta, la comprobación de actualizaciones falla y no lo dice en ningún
sitio visible. Pasó: la instancia instalada aquí seguía en `0.3.0-alpha.2` con `alpha.3` y `alpha.4`
publicadas, porque ese instalador no llevaba el archivo. La sección **Actualizaciones** de los
ajustes sí enseñaba la versión nueva y su enlace, pero instalar sola no era posible.

**Qué cambió**: `scripts/check-desktop-package.mjs` comprueba, sobre la carpeta que deja
electron-builder, que cada app desempaquetada lleva `app-update.yml` con proveedor, repositorio y
carpeta de caché, y que hay un `latest*.yml`. El workflow del escritorio lo ejecuta después de
empaquetar en Windows y Linux, y también está como `npm run check:desktop` para probarlo a mano.
La app, además, avisa por consola si arranca sin ese archivo en vez de fallar en silencio.

**Veredicto**: **arreglo**, dentro de
[ADR 0045](../../adr/0041-0050/0045-el-escritorio-se-instala-y-se-actualiza.md) (M28).
