# Hoja de ruta — ADR 0023 «Lente de dominio, por pasos»

**Decisión:** [el ADR](0023-lente-de-dominio-por-pasos.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-21

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/contenido.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M9 — Lente de dominio, por pasos

**Estado:** ✅ cerrada: el catálogo, el generador y los perfiles propios están. Endurecer las reglas
del perfil para que bloqueen sigue siendo una decisión del equipo (y por defecto son avisos).

Decisión en [ADR 0023](0023-lente-de-dominio-por-pasos.md).

- [x] **M9.1** Catálogo de perfiles declarativos (`capas`, `hexagonal`, `onion`, `ddd`): `.codarch.yml`
  acepta `profile: <id>` y las reglas del perfil se añaden a las del equipo.
- [x] Las reglas del perfil entran **como aviso** (`warn`): consultan, no bloquean. El equipo las
  sube a `error` escribiéndolas otra vez, cuando el código esté listo.
- [x] El reporte dice qué perfil se aplicó (`rules.profile`) y de dónde sale cada regla
  (`source`), y el comando `codarch profiles` lista el catálogo.
- [x] **M9.2** Generador, versión 0.01: `codarch suggest` agrupa por carpeta, ordena por dependencia y
  propone capas y reglas. Dice además qué perfil del catálogo encaja y qué reglas incumple el código
  hoy. Si encaja un perfil, la propuesta usa su convención (no la que deduce el código, que con una
  violation sale invertida). Propone, no decide.
- [x] **M9.3** Endurecer, cuando toque: `profile_severity: error` sube las reglas del perfil a
  bloqueo. Sigue siendo una decisión del equipo (y por defecto son avisos).
- [x] **M9.4** Perfiles propios del equipo, en el propio archivo de reglas (`profiles:`), con la
  misma forma que los del catálogo.
- [x] Las apps usan todo esto: el panel de PR de la web y del escritorio enseñan el perfil y
  marcan de dónde sale cada regla; el MCP devuelve el perfil en `list_violations`.

## Decisiones relacionadas

- [ADR 0011 «Reglas de arquitectura en `.codarch.yml`»](../0011-0020/0011-reglas-de-arquitectura.md) — M2, M9
- [ADR 0022 «La migración, donde ya faltaba»](0022-la-migracion-donde-faltaba.md) — M8, M9
