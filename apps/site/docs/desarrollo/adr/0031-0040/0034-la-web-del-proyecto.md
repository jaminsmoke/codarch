---
title: ADR 0034 — La web del proyecto
description: "El repo es público ✓ desde el 2026-10-22 ✓, pero no tiene puerta ✓: quien llega ve un README ✓ y tiene que instalar desde el principio ✓. Y el material que explica el…"
section: desarrollo
status: aceptado
date: "2026-10-22"
sidebar:
  label: La web del proyecto
  order: 34
---

**Estado:** aceptado · **Fecha:** 2026-10-22

## Contexto

El repo es público ✓ desde el 2026-10-22 ✓, pero **no tiene puerta** ✓: quien llega ve un README ✓
y tiene que instalar desde el principio ✓. Y el material que explica el producto ✓ —los ADR ✓, el roadmap
✓, la guía ✓, el modelo ✓, las reglas ✓— está en markdown ✓, que se lee bien en GitHub ✓ pero no se
**navega** ✓ ni se **presenta** ✓.

Además el paquete de npm ✓ apunta al repo ✓ (`repository` ✓ y `homepage` ✓ ✅), así que un sitio
daría un sitio al que apuntar ✓ ✓.

## Decisión

### 1. Una web, en `apps/site`

React ✓ + Vite ✓ + `react-router` ✓ ✅. Es una app más del monorepo ✓ ✅, como la web ✓ y el
escritorio ✓ ✅, y sale **estática** ✅ → se publica en **GitHub Pages** ✅ ✅.

El repo ya tiene React ✓, Vite ✓ y Radix ✓ ✅: el camino de menos resistencia ✓ ✓ es reusarlos ✓ ✅,
y el sitio se parece a la app ✓ porque comparte sus **tokens de color** ✓ ✓ ✅.

### 2. El markdown es la verdad: la web lo **genera**, no lo reescribe

Cada página de documentación ✓ sale del markdown del repo ✓ ✓, leído **en el build** ✓ ✅ (un
`import.meta.glob` ✓ ✅) y renderizado con `marked` ✓ ✓. El texto **no** se copia a los componentes
✓ ✗: si se copiara ✓, habría dos verdades ✓ ✗ —justo lo que se acaba de limpiar ✓.

Las páginas de los documentos ✓ ✅ —los ADR ✓ ✅, el roadmap ✓ ✅, el modelo ✓ ✅, las reglas ✓ ✅,
el MCP ✓ ✅, la migración ✓ ✅ y el diseño del mapa ✓ ✅— **están publicadas** ✅ ✅: una página por
documento ✅ ✅, con su menú ✅ ✅, su índice ✅ ✅ y sus vecinos ✅ ✅. La guía ✓ ✓ es el caso raro ✓ ✅:
su contenido ✓ ✓ son los markdown ✓ ✅ (`apps/site/docs/guideline/entradas/` ✅ ✅) ✓ ✅ y la línea del tiempo
✓ ✅ se arma sola ✓ ✅ ✅.

### 3. La guía sigue siendo su propia página

La guía ✓ es el documento **vivo** ✓ ✓: se edita como HTML ✓ ✓ —que es lo que hace falta para
mover y reordenar entradas ✓ ✓— y ya tiene su línea del tiempo ✓ ✓. Se publica **tal cual** ✓ ✓,
en `/guia/` ✓ ✓, y el sitio la enlaza ✓ ✓. No se reescribe en React ✓ ✗: sería tirar su formato
✓ ✓ para ganar nada ✓ ✓.

### 4. Sin `framer-motion`

Lo que pide el sitio ✓ —aparecer al hacer scroll ✓, resaltar ✓, transiciones ✓— lo hacen las
transiciones de CSS ✓ ✓ ✅. Cuarenta kilobytes de dependencia ✓ para dos animaciones ✓ no
compensan ✓ ✓.

### 5. Se publica con un workflow

Un workflow ✓ ✓ que construye el sitio ✓ y lo sube a GitHub Pages ✓ ✅ ✅. La URL queda en
`jaminsmoke.github.io/codarch` ✓ ✓, y el `homepage` del repo ✓ y el del paquete de npm ✓ apuntan
allí ✓ ✓.

### 6. La app del mapa no va aquí (de momento)

La **app web** ✓ (el mapa ✓ ✓) es el producto ✓ ✓ y tiene su propia app ✓ ✓. Publicarla bajo
`/app/` ✓ ✓ es un paso aparte ✓: necesita el *base path* ✓ ✓ y otra build ✓ ✓. Queda para después
✓ ✓.

## Consecuencias

- El repo público ✓ tiene **puerta** ✓ ✓: qué es ✓, cómo se ve ✓, cómo se instala ✓ ✓.
- Los documentos ✓ se **navegan** ✓ ✓ en vez de descargarse ✓ ✗.
- La web es un **artefacto de build** ✓ ✓: el CI la construye ✓ ✓ y Pages la sirve ✓ ✓.
- El sitio y el repo **no pueden contradecirse** ✓ ✓: la web se genera del markdown ✓ ✓ ✅.
- La guía ✓ conserva su página ✓ ✓ y su línea del tiempo ✓ ✓ ✅.

## Alternativas descartadas

- **Astro o VitePress** ✓ ✓: hacen el markdown en diez líneas ✓ ✓, pero el repo ya tiene React ✓
  ✓ y Vite ✓ ✓, y el sitio debería parecerse a la app ✓ ✓ ✅.
- **Copiar el texto a los componentes** ✓ ✗: dos verdades ✓ ✗ ✗.
- **Publicar solo la app del mapa** ✓ ✗: el mapa necesita un snapshot ✓ ✓ y una demo ✓ ✓; el
  producto es el CLI ✓ ✓ y sus documentos ✓ ✓.
- **Un único HTML con todo** ✓ ✗: eso es la guía ✓ ✓, y es una página ✓ ✗ no un sitio ✓ ✓.

## Actualización (2026-10-22)

Tres cosas cambiaron al publicar los documentos y no se tocan arriba ✓ ✅, porque son el registro de
lo que se decidió ese día ✅:

- **La guía ya no es HTML** ✓ ✅: pasó a markdown ✓ ✅
  ([ADR 0035](0035-la-guia-como-changelog.md) 🧭 ✅) y la web la genera como los demás documentos ✓ ✅.
  El §3 describe el estado anterior ✅.
- **Las animaciones usan `motion`** ✓ ✅: la línea del tiempo ✓ ✅ mueve una pastilla entre días ✓ ✅ y
  eso pide `layoutId` ✓ ✅, no una transición de CSS ✓ ✗. El §4 se queda como estaba ✓ ✅: era la
  decisión con dos transiciones ✓ ✅, no con una pastilla que se desliza ✅ ✅.
- **Los documentos están publicados** ✓ ✅: el §2 decía «dos vistas» ✓ ✅ y ahora hay cuatro ✓ ✅
  (`/`, `/guia/`, `/docs/` y `/docs/<ruta>/` ✅ ✅). Una carpeta de `docs/` es una ruta ✓ ✅.

## Hoja de ruta

### M23 — La web del proyecto

**Estado:** en curso. La web está publicada y navegable, con búsqueda y en dos idiomas; falta el
**dominio propio**, que empieza por una compra y un DNS.

- [x] El sitio generado del markdown: portada, documentos, ADR y guía, una página por documento con
  su índice y sus vecinos (ADR 0046).
- [x] Publicado en GitHub Pages por `web.yml`, con `site: https://jaminsmoke.github.io` y
  `base: /codarch` en `apps/site/astro.config.mjs`.
- [x] **Búsqueda** con Pagefind sobre el sitio entero, y sitemap de las 173 páginas.
- [x] Los dos idiomas —`/en/`, `/en/guia/` y los documentos de producto— con una sola ruta por
  vista (M31).
- [ ] **El dominio propio**: apuntar el DNS a GitHub Pages y quitar el `base` del config de Astro,
  que cambia todas las rutas internas y el sitemap; después, redirigir
  `jaminsmoke.github.io/codarch` para no romper los enlaces que ya existen.

### Ideas abiertas

- [La guía: el registro público de plugins](/desarrollo/guia/2026-10-21/#el-registro-publico-de-plugins)
  el registro necesita una **dirección estable**: con la web, el sitio puede ser el sitio
  del proyecto y el registro su índice.


## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
