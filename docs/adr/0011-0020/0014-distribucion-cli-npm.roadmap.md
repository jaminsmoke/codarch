# Hoja de ruta — ADR 0014 «Distribución del CLI como paquete npm único»

**Decisión:** [el ADR](0014-distribucion-cli-npm.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-20

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/contenido.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M3 — MCP y distribución

**Estado:** ✅ cerrado. El servidor MCP local, el CLI publicado en npm y la acción pública funcionan de
extremo a extremo, incluida la prueba desde un repositorio externo.

- [x] `get_architecture_map`, `find_hotspots`, `check_change_impact`, `list_violations`, `explain_module`.
- [x] Las herramientas devuelven datos del snapshot, nunca texto inventado.
- [x] El agente puede pedir el mapa de un PR concreto si su snapshot/reporte están en disco (artefactos de la acción o generados localmente).
- [x] Riesgo compartido entre render y MCP; ciclos verificados por SCC sobre las aristas del snapshot.
- [x] 25 tests de herramientas, servidor, carga de artefactos y raíces múltiples, incluido transporte MCP en memoria, y smoke stdio contra artefactos reales.
- [x] Build reproducible de un paquete `codarch` único con esbuild; assets del mapa copiados junto al bundle.
- [x] Tarball `codarch@0.1.0` (~48 KB) instalado en un proyecto limpio y validado con `analyze`, `inspect`, `diff` y `render`.
- [x] Publicar `codarch@0.1.0` en npm.
- [x] Publicar `codarch@0.1.1` con la lente de migración; `latest` apunta a esa versión.
- [x] Publicar `codarch@0.1.2` con el servidor local (`serve`) y el modo live.
- [x] Publicar `codarch@0.1.3` con persistencia y atajos en la app web; `latest` apunta a esa versión.
- [x] Publicar `codarch@0.1.4` con el estado de vista en la URL, la carga por URL y la navegación por
  flechas; `latest` apunta a esa versión y la acción pública instala ya esa versión.
- [x] Publicar `codarch@0.2.0` con la lente de dominio: catálogo de perfiles, generador de capas y
  la migración en el reporte, el comentario del PR y el MCP. `latest` apunta a esa versión y la
  acción pública instala ya esa versión.
- [x] La acción instala la versión publicada del CLI; `check:action` lo verifica para que no se desincronice.
- [x] La acción instala `codarch` desde npm y ya no ejecuta `npm ci` sobre el proyecto analizado.
- [x] Repo público `jaminsmoke/codarch-action@v1`, generado desde `apps/github-action` con `npm run sync:action`.
- [x] Prueba externa en `jaminsmoke/codarch-action-smoke`: comentario, artefacto, análisis base/head y gate con exit `2`.

## Decisiones relacionadas

- [ADR 0004 «La cuña: PR/CI + MCP»](../0001-0010/0004-cuna-pr-ci-mcp.md) — M2, M3
- [ADR 0013 «Servidor MCP de solo lectura»](0013-mcp-readonly.md) — M3
- [ADR 0015 «Acción pública separada»](0015-accion-publica-separada.md) — M3
