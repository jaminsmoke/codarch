# Hoja de ruta — ADR 0024 «La evolución temporal: el calor y la historia»

**Decisión:** [el ADR](0024-evolucion-temporal.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-21

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/contenido.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M10 — La evolución temporal

**Estado:** ✅ cerrado. La historia del repositorio se guarda, se compara y se ve en las dos apps.
Decisión en [ADR 0024](0024-evolucion-temporal.md).

- [x] **M10.1** La lente de calor: el mapa colorea por commits y el panel lateral lista los
  ficheros más tocados. Los datos ya venían del churn de git.
- [x] **M10.2** La historia, dentro del repo: `codarch analyze --history` guarda la foto en
  `.codarch-history/` (fuera de `.codarch/`, que está ignorado por git, para que la historia sí se
  pueda compartir) y `codarch history` lista la línea del tiempo. El snapshot sigue siendo
  determinista: la fecha va en el índice, nunca dentro del snapshot.
- [x] **M10.3** Comparar dos momentos: `codarch history --from <foto> --to <foto>` usa el mismo
  motor de diff que `codarch diff`, extraído a un módulo compartido.
- [x] **M10.4** Ver la línea del tiempo en la web y en el escritorio: el servidor expone
  `/data/history.json` y las fotos, y el escritorio lo pide por IPC.
- [x] El diff dice **cuánto** ha cambiado el código (rloc añadido, eliminado y en ficheros
  cambiados), no solo cuántos ficheros.
- [x] El MCP puede preguntar por la historia (`get_history`).
