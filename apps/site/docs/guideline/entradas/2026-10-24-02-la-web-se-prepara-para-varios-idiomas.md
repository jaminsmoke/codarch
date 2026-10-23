---
title: La web se prepara para varios idiomas
date: "2026-10-24"
category: docs
verdict: arreglo
---

**Qué era**: la web solo estaba en español y sus cadenas estaban escritas en los componentes, así
que añadir un idioma tocaba código.

**Decisión**: [ADR 0046, §8](../../adr/0041-0050/0046-los-documentos-con-starlight.md). El idioma
por defecto es el español. Las cadenas de la UI viven en `src/lib/i18n.ts` y los componentes
reciben `lang`. Los documentos se traducen por carpeta (`docs/<idioma>/`) y Starlight los sirve
con fallback. Añadir un idioma es copiar la carpeta, traducirla y añadirlo a `locales` e `i18n`;
no se generan traducciones automáticamente.

**Veredicto**: **arreglo**, hecho. La estructura está lista; el primer idioma extra se añadirá
cuando haya quien lo revise.
