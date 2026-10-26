---
title: ADR 0014 — Distribución del CLI como paquete npm único
description: El CLI vive en un monorepo TypeScript con paquetes internos (schema, parsers, metrics, layouts, render) que se consumen como fuente mediante los paths de tsconfig. Eso…
section: desarrollo
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: Distribución del CLI como paquete npm único
  order: 14
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

El CLI vive en un monorepo TypeScript con paquetes internos (`schema`, `parsers`, `metrics`,
`layouts`, `render`) que se consumen como fuente mediante los `paths` de `tsconfig`. Eso es cómodo
para desarrollar, pero obliga a clonar CodArch y ejecutar `tsx` para usar el producto.

M3 exige dejar de depender de un checkout local. Publicar cada paquete interno por separado
multiplicaría versiones y compatibilidades antes de tener usuarios. Además, el parser depende de
módulos nativos de tree-sitter que no se pueden empaquetar como JavaScript.

La elección del gestor de paquetes también estaba abierta. pnpm y Bun ofrecen ventajas, pero el
proyecto ya usa npm workspaces, `package-lock.json` y scripts estándar; cambiar ahora añadiría una
migración sin resolver ningún problema actual. Bun, además, es arriesgado con addons nativos de
Node.

## Decisión

1. **Seguir con npm workspaces.** No se migra a pnpm ni a Bun. El CLI publicado se instala con npm y
   declara sus dependencias de runtime en su propio manifiesto.
2. **Un solo paquete público: `codarch`.** El paquete se genera en `apps/cli/dist` y contiene el
   bundle del CLI, los assets del mapa, la licencia y un README propio. Los paquetes internos no se
   publican.
3. **Bundle ESM con esbuild.** Se empaqueta el código propio y el de los workspaces. Se externalizan
   las dependencias de runtime (`ignore`, `minimatch`, `tree-sitter`, `tree-sitter-typescript`,
   `typescript`, `yaml`) para que npm las instale; en particular, los addons nativos no pueden vivir
   dentro de un bundle.
4. **Assets junto al bundle.** `styles.css` y `client.js` se copian a `dist/`, porque `html.ts` los
   resuelve con `new URL(..., import.meta.url)`. El mapa sigue siendo un HTML autocontenido.
5. **Versión inyectada en build.** `__CODARCH_VERSION__` se define desde `apps/cli/package.json`; en
   desarrollo, sin build, el CLI responde `0.0.0`.
6. **Primera versión: `0.1.0`.** El nombre `codarch` está libre en npm. La publicación es un paso
   explícito (`npm run publish:cli`) que requiere autenticación; el build y el tarball se pueden
   validar sin publicar con `npm run pack:cli`.
7. **Aprobaciones de scripts fijadas.** npm 12 bloquea scripts de instalación no aprobados. El
   `package.json` raíz declara `allowScripts` con versiones exactas para esbuild y tree-sitter, y se
   valida con `npm ci` limpio.

## Consecuencias

- `npm install -g codarch` o `npx codarch` bastan para usar el CLI; no hace falta clonar el repo.
- El tarball es pequeño (~48 KB) y el coste de instalación está en las dependencias, sobre todo
  `typescript` y los addons de tree-sitter.
- Una versión publicada es inmutable; cualquier cambio de comportamiento exige nueva versión.
- La acción de GitHub consume este paquete y vive en un repo público separado
  (`jaminsmoke/codarch-action`), porque GitHub no resuelve acciones de repos privados desde otros
  repos. Ver [ADR 0015](0015-accion-publica-separada.md).
- Las aprobaciones de scripts están fijadas a versiones concretas: actualizar esbuild o tree-sitter
  exige revisar y actualizar `allowScripts`.
- El MCP sigue arrancando desde el checkout con `tsx`; empaquetarlo en el mismo paquete o en uno
  separado queda para una decisión posterior.

## Alternativas descartadas

- **Publicar cada paquete `@codarch/*`.** Multiplica manifiestos, versiones y compatibilidades; el
  valor para el usuario está en el CLI, no en importar piezas internas.
- **Publicar TypeScript y compilar al instalar.** Requiere `tsc`/`tsx` en el consumidor, alarga la
  instalación y expone la estructura interna. El bundle elimina esa dependencia.
- **Bundle con todo incluido.** `yaml` y otras dependencias CommonJS provocan `require` dinámicos
  incompatibles con el bundle ESM; los addons nativos tampoco se pueden empaquetar. Externalizar es
  más robusto.
- **Migrar a pnpm o Bun.** No resuelve un problema actual y añade riesgo en la cadena nativa. Se
  puede reconsiderar si el monorepo crece o si la instalación se vuelve un cuello de botella.
- **Distribuir solo como GitHub Release.** Obliga a descargar y colocar binarios a mano; npm ya es el
  canal natural para una herramienta Node.

## Hoja de ruta

Sin fases abiertas: M3 está cerrada.
