# Hoja de ruta — ADR 0027 «Los ajustes: un sitio donde se configura todo»

**Decisión:** [el ADR](0027-los-ajustes.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-21

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M13 — Los ajustes

**Estado:** ✅ cerrada. Los ajustes y el store de plugins. Decisión en
[ADR 0027](0027-los-ajustes.md).

- [x] **M13.1** Un panel de ajustes con secciones: **Vista** (métrica de área, modo de color),
  **Proyecto** (el proyecto guardado, borrarlo) y **Diagnóstico** (versión, formato del modelo,
  checksum, estado del almacenamiento). La sección **Plugins** llega con M14 ✓.
- [x] Lo que se ajusta se guarda donde ya estaba: las preferencias no cambian de sitio ✓.
- [x] El escritorio lo abre también desde el menú nativo (por IPC ✓).
- [x] Sin biblioteca de componentes completa: un primitive headless para el diálogo (Radix ✓) y el
  CSS de la app sobre las variables que ya existen ✓.
- [x] **M13.2** El store: una sección más de los ajustes ✓, con los plugins del repo ✓, su versión ✓,
  su icono ✓ y un interruptor para activarlos ✓. Dice si a un plugin le falta algo ✓ (WebGL2, GPU ✓)
  y si no se pudo cargar ✓.

## Dónde se aplica

- M14 (Los plugins): [la hoja de su decisión](0028-los-plugins.roadmap.md)
- M16 (Los addons): [la hoja de su decisión](0029-los-addons.roadmap.md)
