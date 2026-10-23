# Changelog — ADR 0037 «Los ciclos: de ejecución, no de tipos»

**Decisión:** [el ADR](0037-los-ciclos-de-ejecucion.md) · **Estado:** aceptado · **Fecha:** 2026-10-23

Este changelog guarda lo que se hizo para esta decisión. La hoja de ruta vive en el
[ADR](0037-los-ciclos-de-ejecucion.md#hoja-de-ruta).

## Lo que se hizo

Todavía no hay cambios de código. Esta decisión abre el trabajo de la hoja de ruta; el primer
commit es solo documentación.

## Decisiones relacionadas

- [ADR 0011 «Reglas de arquitectura en `.codarch.yml`»](../0011-0020/0011-reglas-de-arquitectura.md)
  — la regla `sin-ciclos` cambia de lectura, no de contrato.
- [ADR 0032 «Las versiones y las actualizaciones»](../0031-0040/0032-las-versiones-y-las-actualizaciones.md)
  — el formato `cc.json` 2.x y su checksum siguen siendo la promesa; este cambio afecta a la
  semántica con la que se derivan los ciclos, no al esquema.
