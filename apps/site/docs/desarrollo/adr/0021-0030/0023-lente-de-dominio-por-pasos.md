---
title: ADR 0023 — Lente de dominio, por pasos
description: "Las reglas de arquitectura actuales (.codarch.yml) las escribe el equipo: capas, prohibiciones, umbrales y ciclos. Es potente, pero exige saber qué se quiere y…"
section: desarrollo
status: aceptado ✅
date: "2026-10-21"
sidebar:
  label: Lente de dominio, por pasos
  order: 23
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-21

## Contexto

Las reglas de arquitectura actuales (`.codarch.yml`) las escribe el equipo: capas, prohibiciones,
umbrales y ciclos. Es potente, pero exige saber qué se quiere y escribirlo.

Cada arquitectura tiene sus convenciones ya conocidas (capas, hexagonal, DDD). Escribirlas a mano
una y otra vez en cada repo es trabajo repetido, y el resultado depende de quién lo escribió.

## Decisión

La lente de dominio entra **por pasos**, de menos a más, con el motor que ya existe:

1. **M9.1 — Catálogo de perfiles.** Un catálogo con perfiles declarativos (capas, hexagonal, …).
   `.codarch.yml` acepta `profile: <id>`; el perfil aporta sus capas y sus reglas, y el equipo puede
   añadir las suyas encima. Las reglas del perfil entran **como aviso** (`warn`), no bloquean: son
   una consulta hasta que el equipo decide.

2. **M9.2 — Generador, versión 0.01.** Un análisis que deduce las capas del repo (qué carpetas
   no dependen de "arriba") y propone un perfil o unas capas concretas. La salida es una propuesta
   para pegar en `.codarch.yml`, no un cambio automático.

3. **M9.3 — Endurecer, cuando toque.** Subir las reglas del perfil a `error` y que bloqueen. Se
   decide **en su momento**, mirando cómo está el código y si hace falta de verdad: endurecer a lo
   bruto quema a los equipos que están a mitad de una migración.

4. **M9.4 — Perfiles propios.** Que el equipo pueda guardar sus convenciones como un perfil
   reutilizable, y no solo usar los del catálogo.

## Las dos decisiones que lo gobiernan

**¿Consulta o bloqueo?** Consulta primero. El mecanismo ya está: las reglas del perfil entran con
severidad `warn`, que el gate no bloquea, y el equipo las sube a `error` cuando el código esté
preparado. La alternativa (bloquear desde el primer día) tendría un coste alto y un beneficio
dudoso: nadie ha pedido que un perfil bloquee un PR.

**¿Perfil declarado o inferido?** Los dos, en orden: el catálogo es declarado y rápido; el
generador (M9.2) es para los repos que no encajan en ningún perfil.

## Consecuencias

- El motor de reglas no cambia: un perfil es una configuración de reglas escrita de antemano. La
  lente de dominio no es un sistema nuevo, es contenido.
- Las reglas del perfil se distinguen de las del equipo en el reporte (`source: "profile"`), para que
  nadie bloquee un PR por una regla que no escribió.
- El catálogo es pequeño a propósito: dos o tres perfiles bien pensados valen más que veinte
  medianos.
- El reporte sube a `schemaVersion` `1.2` (el perfil y el origen de las reglas). Los lectores
  reconstruyen los reportes anteriores (ADR 0022).

## Alternativas descartadas

- **Un motor de reglas nuevo para la lente de dominio.** Duplicaría lo que ya existe y no
  compartiría el gate.
- **Que el CLI genere las reglas al vuelo, sin archivo de configuración.** El usuario no vería de
  dónde salen, y el resultado cambiaría en cada análisis. El generador (M9.2) propone; el archivo
  decide.
- **Bloquear desde el principio.** Está descrito arriba.

## Hoja de ruta

Sin fases abiertas: M9 está cerrada.
