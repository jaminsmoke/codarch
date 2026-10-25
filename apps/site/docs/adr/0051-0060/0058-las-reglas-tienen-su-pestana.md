---
title: ADR 0058 — Las reglas tienen su pestaña
description: "El inspector gana una cuarta pestaña, Reglas: saca las violaciones y los hotspots de la pestaña PR, enseña las nuevas, las existentes y las resueltas con su origen, y deja PR como el resumen del cambio. No cambia cc.json ni el checksum."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: Las reglas tienen su pestaña
  order: 58
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

La pestaña **PR** nació para contar el cambio: ficheros, aristas, ciclos, migración
y símbolos. Con el tiempo se le fueron pegando dos cosas que no son el cambio:
las **reglas** —al final, después de todo lo demás— y los **hotspots**. La
primera enseñaba solo las violaciones nuevas, cinco como mucho, y un recuento de
las existentes y las resueltas que no se podía abrir. La segunda repetía una
lista que el resumen ya contaba.

El resultado era una pestaña larga con dos trabajos: explicar el diff y juzgar la
arquitectura. Las reglas son la parte que bloquea un PR, y estaban escondidas.

## Decisión

El inspector gana una cuarta pestaña, **Reglas**, entre Lentes y PR:

1. **Resumen de la arquitectura del cambio.** Nuevas, existentes y resueltas;
   errores y avisos nuevos; cuántas reglas y capas se evaluaron y qué perfil se
   aplicó. La pestaña marca un punto rojo cuando hay violaciones nuevas, para
   que no haya que abrirla para saberlo.
2. **Las tres listas completas.** Nuevas, existentes y resueltas, con la regla,
   su origen (`equipo`, `perfil` o el addon), la severidad, el mensaje y, cuando
   el mensaje no lo cuenta, la arista, la métrica con sus límites o el ciclo.
   Un grupo largo se corta a 25 filas y lo dice.
3. **De dónde viene el ruido.** Un recuento por origen, para separar lo que
   impone el `.codarch.yml` del equipo de lo que llega de un perfil o un addon.
4. **Hotspots**, con su métrica, el antes y el después. Se mudan aquí porque son
   una lectura del cambio, no del pull request.

La pestaña **PR** se queda con lo que es: ficheros, aristas, ciclos, migración,
símbolos y las listas de ficheros tocados. Ni reglas ni hotspots.

`tab=rules` entra en la URL y en las vistas guardadas de los addons, igual que
`file`, `lenses` y `pr`.

**Lo que no cambia:** ni `cc.json`, ni el checksum, ni el reporte. La pestaña lee
el `report.json` que ya existe; sin reporte dice que falta y ofrece cargarlo.

## Consecuencias

- PR deja de mezclar dos preguntas: qué ha cambiado y qué reglas rompe.
- Las violaciones existentes y resueltas se pueden leer enteras, con su detalle,
  no solo contar.
- El origen de una regla se comparte en `rules.ts`: la ficha del fichero
  (ADR 0057) y esta pestaña usan la misma etiqueta.
- La pestaña no inventa reglas que no se violan: el reporte no lleva el catálogo,
  solo las violaciones. Eso queda en la hoja de ruta.
- Tests: conteo por origen, ruta de una violación, `tab=rules` en la URL y en
  las vistas guardadas.

## Alternativas descartadas

- **Dejar las reglas en PR y añadir un filtro.** El problema no era el filtro,
  era que la pestaña tenía dos trabajos y las reglas iban al final.
- **Una pestaña de reglas sin hotspots.** Los hotspots también se leen como
  arquitectura del cambio; dejarlos en PR era mantener la mezcla.
- **Meter las reglas en `cc.json`.** Siguen siendo del diff; cambiaría el
  checksum (ADR 0057).

## Hoja de ruta

### M38 - Las reglas tienen su pestaña

- [x] Cuarta pestaña **Reglas**, compartida por web y escritorio.
- [x] Sacar reglas y hotspots de la pestaña PR.
- [x] Listas de nuevas, existentes y resueltas con origen, severidad y detalle.
- [x] Errores y avisos nuevos, reglas y capas evaluadas, perfil aplicado.
- [x] Recuento por origen y hotspots con su métrica.
- [x] `tab=rules` en la URL y en las vistas guardadas de los addons.
- [x] Hacer de **Lentes** una subsección de Reglas, con el fichero seleccionado
  como contexto ([ADR 0059](0059-tres-pestanas.md)).
- [ ] Filtrar por severidad u origen y buscar una regla por nombre.
- [ ] Enseñar también las reglas configuradas que no se violan: hoy el reporte
  solo lleva violaciones y haría falta el catálogo.

El registro de lo hecho vive en el [feed de la guía](/guia/).
