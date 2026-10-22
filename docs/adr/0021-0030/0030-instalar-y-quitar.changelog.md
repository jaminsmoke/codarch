# Changelog — ADR 0030 «Instalar y quitar: plugins y addons»

**Decisión:** [el ADR](0030-instalar-y-quitar.md) · **Estado:** aceptado · **Fecha:** 2026-10-22

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el [ADR](0030-instalar-y-quitar.md#hoja-de-ruta).

## Lo que se hizo

### M17 — Instalar y quitar plugins y addons

**Estado:** cerrada. La decisión está en [ADR 0030](0030-instalar-y-quitar.md): instalar y quitar son del repo; activar es de la máquina y solo existe en plugins.

- [x] `codarch plugins list|add|remove`, simétrico con `codarch addons`: `add` valida el
  manifiesto y copia la carpeta; `remove` borra la carpeta hija y la quita de la declaración.
  Nunca la contenedora.
- [x] Las dos listas avisan cuando no cuadra: carpeta sin declarar (no entra en el build) y
  declaración sin carpeta. `--json` para el CI.
- [x] El mismo guardia de nombre en plugins y addons; el build aplica el guardia al leer la
  declaración.
- [x] Los ajustes distinguen **instalado** (del repo) de **activado** (de la máquina): los
  plugins se activan, los addons se miran.
- [x] Documentación: cómo se instala y se quita cada uno, y dónde vive cada uno (el plugin en el
  build de CodArch, el addon en el proyecto que analizas).
- [x] Los ejemplos (`plugins/ejemplo`, `addons/ejemplo`) salieron del repo con los comandos
  nuevos; el README y `AGENTS.md` dejan de citarlos.
- [x] **La prueba**: `apps/cli/test/plugins.test.ts` y `addons.test.ts` instalan, listan (también
  cuando la carpeta y la lista no cuadran) y quitan sin tocar la carpeta contenedora.

## Decisiones relacionadas

- [ADR 0028 «Los plugins: piezas del repo que se activan»](0028-los-plugins.md) — M14, M15, M16, M17
- [ADR 0029 «Los addons: conocimiento declarativo»](0029-los-addons.md) — M16, M17
