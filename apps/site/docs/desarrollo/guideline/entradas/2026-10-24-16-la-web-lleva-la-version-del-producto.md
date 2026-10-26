---
title: La web lleva la versión del producto
date: "2026-10-24"
category: chore
verdict: arreglo
---

**Qué es**: que la web diga la misma versión que el escritorio, sin un número propio que subir
aparte, y que `npm run version` lo compruebe.

**Por qué**: la web decía «web» cuando no había servidor, y su `package.json` se quedaba en `0.0.0`
aunque es una superficie del producto. Subir el producto a `0.3.2` dejaba la duda de si había que
tocar también `apps/web`.

**Qué cambió**: `apps/web` lleva la versión del producto en su `package.json` y el comprobador la
exige igual que la del escritorio; la app enseña la que sirve el CLI o, sin servidor,
`PRODUCT_VERSION`. Los paquetes internos y el sitio siguen en `0.0.0`. Cómo se sube ahora está en
[ADR 0051](../../adr/0051-0060/0051-la-version-se-sube-con-un-comando.md).

**Veredicto**: **arreglo**, dentro de
[ADR 0041](../../adr/0041-0050/0041-cada-version-una-vez.md).
