---
title: Changelog — ADR 0045
description: Lo hecho del ADR 0045, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0041-0050/0045-el-escritorio-se-instala-y-se-actualiza
sidebar:
  label: Changelog
  order: 45.5
---

Lo hecho, por orden. La hoja de ruta y lo abierto viven en el [ADR](0045-el-escritorio-se-instala-y-se-actualiza.md).

## 2026-10-23

- Se acepta el camino: instalador por usuario en Windows, DMG/ZIP en macOS y AppImage/deb en Linux,
  con metadatos `latest*.yml` y actualización automática en Windows y Linux.
- `electron-builder.yml` declara el proveedor de GitHub y genera `latest.yml` y `app-update.yml`;
  la prueba local de Windows produjo `codarch-0.3.0-alpha.2-setup.exe`, su `.blockmap` y
  `latest.yml`.
- `electron-updater` comprueba y descarga en segundo plano en Windows y Linux; macOS espera a la
  firma. El workflow sube también los `.zip` de macOS y los metadatos.
- El release automático `desktop-v0.3.1-alpha.1` salió con instaladores, `.blockmap` y los
  metadatos `latest*.yml`.
- macOS sale de la matriz de builds y de la release: sin firma ni notarización, Gatekeeper bloquea
  la app y el actualizador no puede aplicarla. No se mantiene un DMG que no funciona.
- El tag del escritorio pasa a `v<versión>` (`v0.3.1-alpha.2`): `electron-updater` lee el feed de
  GitHub como semver y descartaba `desktop-v*`. El planificador sigue aceptando el prefijo viejo
  para leer el historial.
- Ciclo de actualización probado en Windows: se instaló `0.3.1-alpha.1`, al arrancar encontró
  `0.3.1-alpha.2`, la descargó, se instaló al cerrar y la app volvió a arrancar ya como
  `0.3.1-alpha.2`. El primer intento usó el blockmap de la etiqueta vieja, dio 404 y cayó a la
  descarga completa; es el comportamiento esperado del puente entre etiquetas.
- `desktop-v0.3.1-alpha.2` se renombró a `v0.3.1-alpha.2`; la release de `alpha.1` conserva su
  etiqueta histórica. macOS queda fuera de la matriz y de los assets.
- El release deja de llevar ejecutables portables: se quita el `.exe` portable de Windows y el
  AppImage de Linux. Windows publica `setup.exe` (NSIS) y Linux `.deb`; son instaladores, y son
  los que `electron-updater` puede reemplazar.
- `v0.3.1-alpha.3` sale solo con instaladores: `setup.exe`, su `.blockmap`, `.deb`, `latest.yml` y
  `latest-linux.yml`. Ya no hay `x64.exe` portable ni AppImage.
- La firma y la notarización quedan fuera de esta fase: Windows y Linux son los canales publicados.
