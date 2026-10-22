# Hoja de ruta — ADR 0028 «Los plugins: piezas del repo que se activan»

**Decisión:** [el ADR](0028-los-plugins.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-21

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/contenido.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M14 — Los plugins

**Estado:** ✅ cerrada con un plugin de prueba ✓. Piezas del repo que se activan desde los ajustes.
Decisión en [ADR 0028](0028-los-plugins.md).

- [x] La carpeta `plugins/`, con un plugin en su carpeta y su manifiesto `plugin.json` (nombre,
  versión, título, icono, qué aporta y qué necesita).
- [x] El contexto del plugin: el modelo, la selección, las acciones, las preferencias y el estado de
  la URL. Un contrato **pequeño y explícito** ✓ (`@codarch/plugin-api` ✓).
- [x] Compilado (lo declara el repo en `.codarch.yml`) y activado (lo decide el usuario, en
  local ✓). Lo que no está compilado no entra en el bundle ✓: el registro se genera en el build ✓.
  El código del plugin se descarga **la primera vez que se usa** ✓.
- [x] El store en los ajustes ✓ (M13.2 ✓).
- [x] Un plugin **no** puede añadir lentes al modelo: cambiaría el checksum del snapshot ✓.
- [x] **La prueba**: `plugins/ejemplo/` ✓ (hasta M17 ✓), un plugin de juguete que añade una pestaña
  al mapa ✓ y comprueba el contrato entero (el modelo ✓, la selección ✓, las acciones ✓, las
  preferencias ✓). Si esa vista funciona, la vista 3D también ✓.

### M15 — La vista 3D

**Estado:** ✅ cerrada. El primer plugin, y la prueba de que el sistema sirve.

- [x] Una pestaña nueva en el mapa central, que cambia solo el mapa (las barras siguen igual ✓).
- [x] Three.js cargado bajo demanda ✓: el plugin va en su propio chunk ✓ (495 KB ✓) y el bundle
  principal no crece ✓.
- [x] El plugin declara sus requisitos (WebGL2 ✓, GPU ✓) y la app los comprueba ✓.
- [x] Orbitar y zoom con el ratón ✓; al pulsar una caja se selecciona el fichero ✓.
- [x] **Su propia hoja de ruta** (`plugins/vista-3d/ROADMAP.md` ✓): el octree y el nivel de
  detalle para los repositorios grandes ✓, las carpetas como contenedores ✓ y las etiquetas ✓.
  Empezar por el `RenderModel` tal cual ✓ y migrar después ✓.

## Decisiones relacionadas

- [ADR 0027 «Los ajustes: un sitio donde se configura todo»](0027-los-ajustes.md) — M13, M14, M16

## Dónde se aplica

- M16 (Los addons): [la hoja de su decisión](0029-los-addons.roadmap.md)
- M17 (Instalar y quitar plugins y addons): [la hoja de su decisión](0030-instalar-y-quitar.roadmap.md)
