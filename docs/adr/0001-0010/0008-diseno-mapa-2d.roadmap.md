# Hoja de ruta — ADR 0008 «Diseño del mapa 2D»

**Decisión:** [el ADR](0008-diseno-mapa-2d.md) · **Estado:** aceptado ✅ · **Fecha:** 2026-10-20

Esta hoja guarda el trabajo de esta decisión ✓. Si la decisión crece ✓, su hoja crece con ella ✓;
el [roadmap general](../../roadmap.md) solo la indexa ✓ y la [guía](../../guideline/contenido.md) guarda las
ideas que aún no son fase ✓.

## Fases de esta línea

### M5 — App web

**Estado:** ✅ cerrada en lo funcional; queda pulido (iconos propios hechos, queda afinar el detalle).

App web en `apps/web` (React + Vite) sobre `@codarch/render`, con mapa y vista de PR.

- [x] Cargar un `snapshot.cc.json` local (botón o drag & drop) y una demo incluida.
- [x] Reutilizar `buildRenderModel` y `layoutMap`; layout dinámico al tamaño del contenedor.
- [x] Selector de área/color, búsqueda por ruta y ficha de fichero.
- [x] Panel de migración: estratos por lenguaje, estados, puentes, FFI y top de deuda.
- [x] Color por estado (`js`, `rust`, `bridge`, `native`) y por cualquier métrica.
- [x] Cargar `report.json` y vista de PR: resumen, reglas, hotspots, ciclos y ficheros.
- [x] Clic en una fila del PR para enfocar el fichero en el mapa.
- [x] Foco por carpeta: clic en la cabecera de una carpeta y breadcrumb para volver.
- [x] Menú **Abrir repositorio o archivo**; el repositorio carga `.codarch/snapshot.cc.json` y `.codarch/report.json`.
- [x] Navegación por teclado completa: flechas, Escape y foco inicial.
- [x] Cargar snapshots/reportes por URL y servir con `codarch serve`; build estático ya disponible.
- [x] Recordar el último snapshot/reporte y el estado de vista.

### M5.1 — Básicos de uso

**Estado:** ✅ cerrada.

- [x] Abrir repositorio por carpeta con File System Access API; fallback `webkitdirectory`.
- [x] Abrir un `cc.json` suelto y cargar el reporte desde la pestaña PR.
- [x] Foco por carpeta y breadcrumb.
- [x] `codarch serve`: analiza al arrancar, sirve el build web y los artefactos; live + SSE.
- [x] Elegir carpeta desde la web, cambiar de repo y alternar live/stop sin reiniciar.
- [x] `npm run web:dev` arranca y para el servidor automáticamente; `CODARCH_NO_AUTOSERVE=1` lo evita.
- [x] Persistencia local del último proyecto con artefactos y de las preferencias de área/color.
- [x] Atajos básicos: `/` busca, `Enter` abre el primer resultado, `Esc` limpia foco/selección.
- [x] Carga por URL y enlaces compartibles con el estado de vista (`area`, `color`, `focus`, `file`, `tab`, `src`, `report`); decisión en [ADR 0018](../0011-0020/0018-estado-vista-en-la-url.md).
- [x] Navegación por flechas entre celdas y foco inicial del mapa.
- [x] Manejo explícito de snapshots grandes: nivel de detalle por tamaño y menos nodos por celda; decisión en [ADR 0019](../0011-0020/0019-nivel-de-detalle-del-mapa.md).

## Decisiones relacionadas

- [ADR 0005 «2D primero, 3D como lente»](0005-2d-first.md) — M0, M5
- [ADR 0017 «Servidor local `codarch serve`»](../0011-0020/0017-servidor-local.md) — M5, M5.1
- [ADR 0018 «Estado de vista en la URL y carga por URL»](../0011-0020/0018-estado-vista-en-la-url.md) — M5, M5.1
- [ADR 0019 «Nivel de detalle del mapa»](../0011-0020/0019-nivel-de-detalle-del-mapa.md) — M5, M5.1

## Dónde se aplica

- M0 (Modelo y mapa, sin parsers): [la hoja de su decisión](0005-2d-first.roadmap.md)
