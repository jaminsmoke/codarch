---
title: La web no tiene versión propia
date: "2026-10-24"
category: chore
verdict: arreglo
---

**Qué es**: que el número de versión salga del producto también en la web, sin subir nada aparte, y
que `npm run version` lo compruebe.

**Por qué**: la web decía «web» cuando no había servidor, y no estaba escrito si tenía versión
propia. Subir el producto a `0.3.2` dejaba la duda de si había que tocar también `apps/web`.

**Qué cambió**: la web enseña la versión que sirve el CLI y, sin servidor, `PRODUCT_VERSION` (el
manifiesto que genera `versions.json`). `apps/web`, `apps/site` y los `packages/*` siguen en `0.0.0`
porque no se publican, y el comprobador de versiones falla si alguno se pone una versión propia por
su cuenta.

**Veredicto**: **arreglo**, dentro de
[ADR 0041](../../adr/0041-0050/0041-cada-version-una-vez.md).
