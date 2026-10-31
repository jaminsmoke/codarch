/**
 * El registro de plugins, vacío.
 *
 * `virtual:codarch-plugins` lo genera el build con los plugins que el repo
 * declara (ADR 0028). En las pruebas no hay build, así que `vitest.config.ts`
 * resuelve ese módulo a este fichero: la app carga con cero plugins.
 */
export const plugins = [];
