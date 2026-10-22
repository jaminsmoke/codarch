# Hoja de ruta — ADR 0029 «Los addons: conocimiento declarativo»

**Decisión:** [el ADR](0029-los-addons.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-22

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/index.html) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M16 — Los addons

**Estado:** ✅ cerrada. El contrato está decidido en [ADR 0029](0029-los-addons.md): un addon es
**datos, no código**. El CLI, las dos apps y el MCP los leen.

- [x] `@codarch/addons`: el manifiesto, la validación (una clave desconocida es error ✓) y la
  fusión con la configuración. Sin código que ejecutar.
- [x] Los addons viven en `addons/<nombre>/` y el repo los declara en `.codarch.yml`
  (`addons: [...]`). `codarch addons list|add|remove` los lista, los copia y los quita.
- [x] Un addon aporta perfiles, reglas y vistas guardadas; manda la configuración del equipo y cada
  regla dice de dónde sale (`source: "addon:<nombre>"`).
- [x] `codarch diff` los carga y aplica sus reglas; la acción también, porque ejecuta el CLI.
- [x] El checksum no cambia: un addon vive en la capa de la configuración, no en la del snapshot.
- [x] `codarch addons list` y las dos apps enseñan los addons del proyecto y aplican sus **vistas
  guardadas**; el MCP lee la configuración para verlos (la guía: «Las reglas del addon no llegan al MCP») ✓.
- [x] **La prueba**: `addons/ejemplo/` ✓ (hasta M17 ✓) estuvo en el repo y se veía en el mapa (su
  vista guardada «Los paquetes»), en el reporte (cada violación con `source`) y en el PR (el
  comentario decía `addon \`ejemplo\``).
- [x] El store de los ajustes enseña los addons **del proyecto** en modo lectura (ADR 0029) ✓: son
  del repo, no se activan ni se desactivan como los plugins ✓.

## Decisiones relacionadas

- [ADR 0027 «Los ajustes: un sitio donde se configura todo»](0027-los-ajustes.md) — M13, M14, M16
- [ADR 0028 «Los plugins: piezas del repo que se activan»](0028-los-plugins.md) — M14, M15, M16, M17

## Dónde se aplica

- M17 (Instalar y quitar plugins y addons): [la hoja de su decisión](0030-instalar-y-quitar.roadmap.md)
