# Hoja de ruta — ADR 0021 «App de escritorio (Electron) con código copiado, no compartido»

**Decisión:** [el ADR](0021-app-de-escritorio.md) · **Estado:** aceptado · **Fecha:** 2026-10-21

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M7 — App de escritorio

**Estado:** cerrado. Electron con su propia interfaz, sin importing nada de `apps/web`; el motor es el
mismo. Decisión en [ADR 0021](0021-app-de-escritorio.md).

- [x] Empaquetado de escritorio con el mismo build web.
- [x] Analizador local integrado (el CLI en proceso, sin servidor).
- [x] Diálogo de carpeta nativo y apertura de fichero.
- [x] Menú nativo, atajos de sistema (`Cmd/Ctrl+O`, `Cmd/Ctrl+Shift+O`) y "abrir con" desde el
  explorador de archivos: una carpeta se analiza, un `cc.json` se abre como snapshot y un
  `report.json` como reporte.
- [x] Instaladores **sin firmar** para Windows (NSIS y portable), macOS (dmg) y Linux (AppImage y
  deb), con electron-builder y un workflow de CI. Sin firma, el sistema avisa al usuario; firmarlo
  cuesta dinero y queda para cuando el producto lo justifique.
