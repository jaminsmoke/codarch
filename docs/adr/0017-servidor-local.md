# ADR 0017 — Servidor local `codarch serve`

**Estado:** aceptado · **Fecha:** 2026-10-20

## Contexto

La app web carga snapshots y reportes ya generados. Eso es rápido y determinista, pero obliga a
ejecutar `codarch analyze` a mano y refrescar el navegador. También deja fuera el caso natural de
“quiero ver el mapa mientras programo”.

El análisis en el navegador (tree-sitter WASM, FS virtual) es M6 y no resuelve el flujo local a corto
plazo. Un servidor local pequeño puede hacerlo sin duplicar el analizador: usa el mismo
`analyzeRepository` del CLI y sirve el build estático de la app.

Esto no es un monitor de GitHub ni un servicio remoto. Los PR siguen en la GitHub Action.

## Decisión

1. **Comando `codarch serve [root]`.** Analiza el repo al arrancar, sirve la app web y expone el
   snapshot en `/data/snapshot.cc.json`. El reporte de `.codarch/report.json`, si existe, se sirve en
   `/data/report.json` para la vista de PR.
2. **Solo loopback y solo lectura.** Por defecto escucha en `127.0.0.1:4173`. No escribe en el
   repositorio, no habla con GitHub y no tiene autenticación. Se puede cambiar host/puerto de forma
   explícita, pero no está pensado para exponerse.
3. **Watch live por defecto, `--no-watch` para desactivarlo.** Observa el árbol con `fs.watch`
   recursivo, ignora `.git`, `node_modules`, `.codarch`, `dist`, `coverage`, `.next`, `out` y
   `target`, y reanaliza con debounce de 350 ms. Cada actualización se publica por SSE en `/events`;
   la app se suscribe solo si `/data/meta.json` indica `watch: true`. El modo sin watch queda para
   servidores de solo lectura o repos grandes.
4. **La app entiende dos orígenes.** Si existen `data/snapshot.cc.json` y `data/meta.json`, carga el
   servidor; si no, usa la demo. El snapshot del servidor se actualiza con `preserveView` para no
   perder área, color, búsqueda o foco en cada guardado.
5. **Selección de carpeta y control live desde la web.** Como el navegador no entrega una ruta
   absoluta al seleccionar una carpeta, el servidor expone `GET /api/browse` y `POST /api/root`:
   la app navega el filesystem local y, al elegir una carpeta, el servidor la analiza y empieza a
   vigilarla. `POST /api/watch` activa o detiene el watcher; la app refleja `live` o `servido`.
6. **El build web viaja en el paquete.** `build:cli` copia `apps/web/dist` a `apps/cli/dist/web` y el
   manifiesto publicado incluye `web`. Así `npx codarch serve` funciona sin Vite ni clonar el repo.
   `pack:cli` y `publish:cli` construyen la web antes del CLI.
7. **Mismo modelo y mismas métricas.** El servidor no reimplementa nada: usa el snapshot del parser,
   con la lente de migración y el reporte existentes. La app solo cambia el transporte.

## Consecuencias

- Ver el mapa en vivo cuesta un reanálisis completo; en repos pequeños es ~1-2 s. No hay caché
  incremental todavía.
- El paquete npm crece (~100 KB comprimidos) por el build web; a cambio, el visor local no depende de
  un checkout.
- El servidor es mono-usuario y local. No hay cuotas, sesiones ni autorización; exponerlo fuera de
  loopback es responsabilidad del usuario y no está soportado.
- La selección de carpeta desde la web solo funciona con `codarch serve` arrancado; no es análisis
  en el navegador. Expone el filesystem local a la app en loopback, con APIs sin autenticación.
- El watch puede perder eventos si el editor escribe de forma no atómica; el debounce y el
  reanálisis completo lo hacen tolerable. En repos muy grandes, `--no-watch` evita reanálisis
  constantes.
- La vista de PR del servidor solo muestra un `report.json` ya generado. No calcula un diff contra
  otra rama; para eso están `codarch diff` y la acción.
- El análisis por navegador y la carga por URL siguen en M5.1/M6.

## Alternativas descartadas

- **Solo servidor estático.** No resuelve el análisis al arrancar ni el refresco; obliga a ejecutar el
  CLI y recargar a mano.
- **Analizar en el navegador ahora.** Requiere parser WASM y FS virtual; es M6, no un atajo.
- **Servicio HTTP remoto con auth.** Añade despliegue, cuotas y multi-tenant antes de validar el uso
  local. La cuña de PR ya está cubierta por la acción.
- **Escribir el snapshot en `.codarch` en cada cambio.** Ensucia el repo, compite con el CLI y hace
  que el watch se realimente. El snapshot vive en memoria.
- **Watch externo o solo opt-in.** Un watcher externo añade otra pieza; el opt-in hacía que el flujo
  “abrir carpeta y ver cambios” no fuera el camino por defecto. Se elige live por defecto y
  `--no-watch` para el caso contrario.
