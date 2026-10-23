---
title: Changelog — ADR 0021 «App de escritorio (Electron) con código copiado, no compartido»
description: Lo hecho del ADR 0021, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0021-0030/0021-app-de-escritorio
sidebar:
  label: Changelog
  order: 21.5
---

**Decisión:** [el ADR](0021-app-de-escritorio.md) · **Estado:** aceptado · **Fecha:** 2026-10-21

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el [ADR](0021-app-de-escritorio.md#hoja-de-ruta).

## Lo que se hizo

### M7 — App de escritorio

**Estado:** cerrado. Electron con su propia interfaz, sin importing nada de `apps/web`; el motor es el mismo. Decisión en [ADR 0021](0021-app-de-escritorio.md).

- [x] Empaquetado de escritorio con el mismo build web.
- [x] Analizador local integrado (el CLI en proceso, sin servidor).
- [x] Diálogo de carpeta nativo y apertura de fichero.
- [x] Menú nativo, atajos de sistema (`Cmd/Ctrl+O`, `Cmd/Ctrl+Shift+O`) y "abrir con" desde el
  explorador de archivos: una carpeta se analiza, un `cc.json` se abre como snapshot y un
  `report.json` como reporte.
- [x] Instaladores **sin firmar** para Windows (NSIS y portable), macOS (dmg) y Linux (AppImage y
  deb), con electron-builder y un workflow de CI. Sin firma, el sistema avisa al usuario; firmarlo
  cuesta dinero y queda para cuando el producto lo justifique.
