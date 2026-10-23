---
title: Changelog — ADR 0041
description: Lo hecho del ADR 0041, por orden. La hoja de ruta y lo abierto viven en el ADR.
section: adr
changelog: true
adr: adr/0041-0050/0041-cada-version-una-vez
sidebar:
  label: Changelog
  order: 41.5
---

Lo hecho, por orden. La hoja de ruta y lo abierto viven en el [ADR](0041-cada-version-una-vez.md).

## 2026-10-23

- `versions.json` declara `product`, `ccJson`, `report`, `config`, `history` y `chainLedger` ✓.
- `packages/versions/src/manifest.ts` se genera desde ese fichero y exporta las constantes ✓.
- El schema, el parser, las métricas, el CLI y el MCP usan las constantes ✓.
- `scripts/version.mjs` actualiza el manifiesto, los `package.json` y el lock ✓, y comprueba que
  cuadren sin argumentos ✓.
- El lector del reporte conserva las versiones antiguas además de la actual ✓.
- El MCP anuncia la versión del producto ✓ y su `package.json` sigue la misma ✓.
- La acción conserva su pin publicado ✓ y `check:action` lo comprueba ✓.
- Test de que el manifiesto, `versions.json` y los `package.json` no se separan ✓.
