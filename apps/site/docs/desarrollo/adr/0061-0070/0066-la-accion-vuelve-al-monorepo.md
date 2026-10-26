---
title: ADR 0066 — La acción vuelve al monorepo
description: "El repo separado codarch-action nació porque el monorepo era privado. Ya es público: la acción vive en apps/github-action y se usa por subruta, con el tag v1 en el mismo repo."
section: desarrollo
status: aceptado
date: "2026-10-25"
sidebar:
  label: La acción vuelve al monorepo
  order: 66
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

El ADR 0015 creó `jaminsmoke/codarch-action` por una razón concreta: el
monorepo `jaminsmoke/codarch` era **privado** y GitHub no resuelve una acción
de un repositorio privado desde otro repositorio. La copia pública solo tenía
`action.yml`, el render del comentario, el README y la licencia.

Ese supuesto ya no se cumple: el monorepo es público desde el 2026-10-22
(ADR 0033). Mantener el repo separado obliga a sincronizar dos copias y a mover
dos tags; el ADR 0065 lo dejó como el último paso manual de cada publicación
del CLI.

GitHub permite usar una acción que vive en una **subcarpeta** de un repo
público: `uses: jaminsmoke/codarch/apps/github-action@v1`. No hace falta un
repo dedicado.

## Decisión

1. **La fuente sigue siendo `apps/github-action`.** No se mueve el código ni se
   duplica.
2. **Los consumidores usan la subruta**:
   `uses: jaminsmoke/codarch/apps/github-action@v1`.
3. **El tag `v1` vive en el monorepo.** Se mueve después de publicar el CLI,
   junto con el pin de la versión, y apunta al commit que instala una versión
   ya publicada en npm.
4. **Se retira la sincronización.** No hay `sync:action`, ni
   `.codarch/action-repo`, ni segunda copia del `action.yml`. El workflow
   interno ya usaba `./apps/github-action`; ahora coincide con lo que usa el
   consumidor.
5. **El repo `codarch-action` se archiva.** Se deja de mantener y su README
   remite al monorepo. No se borra para no romper los `uses` antiguos que aún
   apunten allí.

## Consecuencias

- Un solo repo, una sola copia de la acción y un solo tag `v1`.
- El pin y el tag se actualizan en el mismo workflow que publica el CLI.
- **No hay listado en Marketplace**: Marketplace exige `action.yml` en la raíz
  del repo. La subruta funciona igual desde cualquier workflow. Si algún día
  importa el escaparate, se añade un `action.yml` raíz que delega; no se
  recupera el repo separado.
- Los repos que usen `jaminsmoke/codarch-action@v1` siguen funcionando mientras
  el repo esté archivado; se les invita a cambiar a la subruta.
- `codarch-action-smoke` cambia su `uses` a la subruta en la siguiente prueba
  externa.

## Alternativas descartadas

- **Mantener el repo separado.** Dos copias que se desincronizan justo cuando
  el monorepo ya es público.
- **Copiar `action.yml` a la raíz del monorepo.** Permite Marketplace, pero
  duplica el fichero y obliga a mantener dos rutas para
  `render-comment.mjs`. Se puede hacer más adelante sin reabrir el repo.
- **Publicar la acción en otro repo generado.** Es el problema que se quiere
  quitar, con otro nombre.

## Hoja de ruta

### M46 — La acción vuelve al monorepo

- [x] La acción se usa por subruta desde `jaminsmoke/codarch`.
- [x] `v1` se mueve en el monorepo después de publicar el CLI.
- [x] Fuera `sync:action` y la copia pública generada.
- [x] README, workflow de release y documentación apuntan a la subruta.
- [x] El repo `codarch-action` queda archivado con un aviso.
- [ ] Actualizar `codarch-action-smoke` a la subruta.
- [ ] Añadir `action.yml` raíz si se quiere Marketplace.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
