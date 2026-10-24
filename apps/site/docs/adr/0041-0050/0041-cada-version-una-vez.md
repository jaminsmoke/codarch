---
title: ADR 0041 — Cada versión se declara una vez
description: ADR 0032 dejó una versión para el producto ✓ y un comando que la escribe en el CLI y en el escritorio ✓. Funciona para el número de release ✓, pero no para las versiones…
section: adr
status: aceptado
date: "2026-10-23"
sidebar:
  label: Cada versión se declara una vez
  order: 41
---

**Estado:** aceptado · **Fecha:** 2026-10-23

## Contexto

ADR 0032 dejó una versión para el producto ✓ y un comando que la escribe en el CLI y en el
escritorio ✓. Funciona para el número de release ✓, pero no para las **versiones de formato** ✓:
`cc.json` decía `2.0` en el generador y en el normalizador ✓, el reporte decía `1.3` en el tipo y en
la creación ✓, y `.codarch.yml`, el historial y el libro de cadenas repetían `1` y `2` en cada
retorno ✓. Además, el MCP se anunciaba como `0.0.0` ✓ y la acción guardaba una versión publicada
aparte ✓.

El resultado ✓: un cambio de formato obliga a buscar literales por el repo ✓, y el que se olvida no
falla hasta que un lector rechaza un fichero ✓. La acción ya tenía su comprobación ✓, pero el resto
no ✓.

## Decisión

### 1. `versions.json` es la fuente

En la raíz del repo vive un único fichero con las versiones declaradas:

| Campo | Qué versiona | Forma |
|---|---|---|
| `product` | el producto, el CLI, el escritorio y el MCP | semver |
| `ccJson` | el formato `cc.json` | `mayor.menor` |
| `report` | el esquema de `report.json` | `mayor.menor` |
| `config` | `.codarch.yml` | entero |
| `history` | el índice de `.codarch-history/` | entero |
| `chainLedger` | el libro mayor de cadenas | entero |

Cada componente que necesita una versión tiene **su** campo ✓; no se comparten por casualidad ✓.
`product` sigue siendo una sola versión para las piezas que se publican juntas ✓ (ADR 0032).

### 2. El código importa constantes, no literales

`packages/versions/src/manifest.ts` se genera desde `versions.json` ✓ y exporta
`PRODUCT_VERSION`, `CC_JSON_VERSION`, `REPORT_SCHEMA_VERSION`, `CONFIG_VERSION`, `HISTORY_VERSION`
y `CHAIN_LEDGER_VERSION` ✓. El schema, el parser, las métricas, el CLI, el MCP y el escritorio
importan esas constantes ✓; los literales de versión no se escriben a mano en el código de
producción ✓.

Los tests y los fixtures pueden conservar versiones antiguas ✓: existen justo para probar que un
lector reconstruye un `1.0` o acepta un `2.x` ✓. Los ejemplos de la documentación también son
ilustrativos ✓; la versión vigente es la de `versions.json` ✓.

### 3. Un comando actualiza y comprueba

```bash
npm run version -- 0.4.0-alpha.1      # el producto
npm run version -- --schema 2.1       # cc.json
npm run version -- --report 1.4       # el reporte
npm run version -- --config 2         # .codarch.yml
npm run version -- --history 2        # el historial
npm run version -- --chains 3         # las cadenas
npm run version                       # comprobar que todo cuadra
```

El comando escribe `versions.json`, regenera el manifiesto y, cuando cambia `product`, propaga la
versión a los `package.json` de la raíz, el CLI, el escritorio y el MCP y a `package-lock.json` ✓.
Sin argumentos comprueba lo mismo que el CI ✓: manifiesto, `package.json` y lock ✓. Si alguien edita
un sitio a mano ✓, el CI falla ✓.

Los paquetes que no se publican (`apps/web`, `apps/site`, `packages/*`) se quedan en `0.0.0`: no
tienen versión propia. La web enseña la que sirve el CLI y, sin servidor, la del producto
(`PRODUCT_VERSION`), así que no hay un número que subir aparte. `npm run version` comprueba también
que nadie se haya puesto una versión por su cuenta.

### 4. La acción instala una versión publicada, no la del repo

El input `version` de la acción ✓ es un **pin de despliegue** ✓: la última versión de `codarch`
publicada en npm ✓. No es la versión del producto en el repo ✓ y no se actualiza al preparar una
release ✓; se actualiza después de publicar ✓. `npm run check:action` sigue comprobando que no
instale una versión futura ni se quede atrás de npm ✓.

## Consecuencias

- Cambiar el formato `cc.json` es editar `ccJson` y ejecutar el comando ✓; el generador, el
  normalizador y el snapshot de prueba usan el mismo valor ✓.
- Cambiar el reporte es editar `report` ✓; `DiffReport`, la creación y el lector usan la misma
  constante ✓, y el lector sigue aceptando las versiones antiguas ✓ (la lista de versiones
  conocidas conserva las viejas a propósito ✓).
- El MCP anuncia la versión real del producto ✓, no `0.0.0` ✓.
- La acción conserva su pin ✓ y su comprobación ✓.
- `npm run version` sin argumentos es la puerta del CI ✓; una divergencia se ve antes de publicar ✓.

## Alternativas descartadas

- **Una constante por paquete, sin manifiesto**: reparte la verdad otra vez ✓; el script tendría que
  conocer cada módulo ✓ y el código seguiría importando literales en los bordes ✓.
- **Leer `package.json` en tiempo de ejecución**: el schema también corre en el navegador ✓ y no
  debe arrastrar el `package.json` del repo ✓; el manifiesto generado es pequeño y determinista ✓.
- **Una sola versión para todo**: el producto puede cambiar sin que cambie `cc.json` ✓, y el reporte
  puede cambiar sin que cambie el producto ✓; mezclarlos mentiría sobre la compatibilidad ✓.

## Hoja de ruta

Sin fases abiertas: es una decisión de mantenimiento que se aplica en todo el repo.

### Ideas abiertas

- Que `npm run version -- --report` avise si hay reportes antiguos que ya no se saben reconstruir.
  Hoy el lector conserva la lista de versiones conocidas; al subir el reporte hay que añadir la
  versión que se deja atrás.
