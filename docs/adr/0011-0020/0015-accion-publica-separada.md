---
title: ADR 0015 — Acción pública separada
description: El CLI ya se publica como codarch@0.1.1 y la acción compuesta vive en apps/github-action. La primera prueba desde un repositorio externo falló al resolver…
section: adr
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: Acción pública separada
  order: 15
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

El CLI ya se publica como `codarch@0.1.1` y la acción compuesta vive en `apps/github-action`. La
primera prueba desde un repositorio externo falló al resolver `jaminsmoke/codarch/apps/github-action@v1`:
GitHub devolvió `repository not found` porque `jaminsmoke/codarch` es privado y el token del workflow
de destino no puede leerlo.

Mantener el monorepo privado era un requisito del proyecto. GitHub no permite usar acciones de un
repositorio privado desde otro repositorio, ni siquiera del mismo dueño, sin un checkout manual. Un
checkout manual dentro del workspace contaminaría el análisis y complicaría el workflow.

La acción no contiene secretos: solo `action.yml`, el render del comentario, el README y la licencia.
El CLI que ejecuta se instala desde npm.

## Decisión

1. **Repo público dedicado: `jaminsmoke/codarch-action`.** Contiene únicamente la acción compuesta, el
   render del comentario, el README y la licencia. El monorepo `jaminsmoke/codarch` sigue privado.
2. **Generado desde el monorepo.** `npm run sync:action` copia `apps/github-action` a
   `.codarch/action-repo` y añade un aviso de que el repo es generado. La fuente de verdad sigue
   siendo `apps/github-action`.
3. **La acción instala el CLI desde npm.** No necesita el código de CodArch en el workspace ni
   ejecuta `npm ci` sobre el proyecto analizado. La versión se fija con el input `version`
   (`0.1.1` por defecto).
4. **Tag mayor `v1`.** Los consumidores usan `jaminsmoke/codarch-action@v1`. El tag se mueve al
   sincronizar cambios compatibles; una ruptura de la interfaz de la acción exige `v2`.
5. **El workflow interno sigue usando `./apps/github-action`.** Así el monorepo dogfoodea la fuente y
   no depende de que el repo público esté sincronizado en cada commit.

## Consecuencias

- Cualquier repositorio, público o privado, puede usar la acción sin clonar CodArch.
- El código de la acción es público, pero el monorepo y su historial no.
- Hay dos copias de los ficheros de la acción. `npm run sync:action` y el tag `v1` deben actualizarse
  juntos; el README del repo público lo advierte.
- La primera validación externa se hizo en `jaminsmoke/codarch-action-smoke`: un PR con un cambio
  limpio pasó y otro con una dependencia `domain → infra` falló con exit `2`, comentario y artefacto.
- El repo público no publica el CLI; solo la acción. La versión del CLI se gestiona en npm.

## Alternativas descartadas

- **Hacer público el monorepo.** Expone todo el código y el historial; no es necesario para
  distribuir la acción.
- **Usar la acción desde el monorepo privado.** GitHub no la resuelve desde otro repositorio.
- **Checkout manual de CodArch en el workflow del consumidor.** Contamina el workspace analizado,
  exige un token con acceso al repo privado y complica el `uses`.
- **Publicar la acción en GitHub Marketplace sin repo propio.** Marketplace requiere un repo público
  y una release; el repo dedicado es el paso previo natural.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M3.

El detalle de lo hecho está en el [changelog](0015-accion-publica-separada.changelog.md).
