---
title: ADR 0057 — La ficha del fichero habla de sus lentes
description: "El inspector gana una pestaña Lentes: explica el riesgo con sus tres señales, enseña las reglas de dominio que toca el fichero cuando hay reporte y detalla la deuda de migración y los cruces FFI del snapshot. No cambia cc.json ni el checksum."
section: desarrollo
status: aceptado
date: "2026-10-25"
sidebar:
  label: La ficha del fichero habla de sus lentes
  order: 57
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

El inspector del mapa tiene dos pestañas: **Fichero**, con la ruta, el estado de
migración, las métricas y los símbolos, y **PR**, con el reporte del cambio. La
primera da **números**; la segunda, el diff. Ninguna contesta a la pregunta que
aparece al mirar una celda roja: **¿por qué este fichero?**

Las lentes ya existen y guardan señales que la ficha no explica:

| Señal | Dónde vive | Qué falta |
|---|---|---|
| Riesgo 0-100 | `RenderFile.risk` | De qué tres señales sale y cuánto pesa cada una |
| Migración | `cc.lenses.migration` | Deuda, cruces y las aristas FFI, no solo dos cifras |
| Símbolos | `cc.lenses.symbols` | Cuántos hay y cuál es el más complejo |
| Dominio | `report.json` (diff) | Las reglas exactas que toca el fichero y de dónde salen |

La lente de dominio **no viaja en `cc.json`**: las reglas se evalúan contra el
diff y viven en el reporte. Meterlas en el snapshot cambiaría el formato y el
checksum, y eso es otra decisión.

## Decisión

El inspector gana una tercera pestaña, **Lentes**, compartida por la web y el
escritorio porque vive en `@codarch/ui`:

1. **Riesgo explicado.** La nota 0-100 y tres barras —complejidad, churn y
   tamaño— con su valor, su p95 y el peso que les toca. La fórmula no se
   duplica en la interfaz: `riskBreakdown` vive en `@codarch/metrics` y el
   modelo de render guarda el desglose en `RenderFile.riskParts`. Si una señal
   no existe, se dice y se ve qué pasa con su peso.
2. **Dominio, desde el reporte cargado.** Las violaciones `introduced` y
   `existing` que incluyen la ruta, con severidad, regla, `source` (`equipo`,
   `perfil` o el nombre del addon), mensaje y el detalle de la métrica si la
   hay. Sin reporte, la sección lo dice: no se inventa una lente.
3. **Migración, desde el snapshot.** Estado y lenguaje, deuda, cruces FFI y
   las aristas que tocan el fichero, traducidas de `nodeId` a ruta y con su
   dirección. La deuda se explica con su fórmula.
4. **Símbolos, en resumen.** Cuántos hay, cuántas funciones y cuál es el más
   complejo. La lista completa sigue en **Fichero**.

La pestaña se puede compartir: `tab=lenses` entra en la URL y en las vistas
guardadas de un addon, igual que `file` y `pr`.

**Lo que no cambia:** ni `cc.json`, ni el checksum, ni el mapa. El desglose del
riesgo es presentación; las reglas se leen del reporte que ya existe.

## Consecuencias

- Una sola fórmula del riesgo: `riskScores` pasa a ser `riskBreakdown` sin los
  detalles, y nadie reimplementa los pesos en la UI.
- La lente de dominio depende del reporte, y eso se dice en la ficha. Un
  snapshot sin reporte sigue siendo útil: riesgo, migración y símbolos.
- Las aristas FFI se cruzan con los `nodeId` del modelo; no hace falta guardar
  rutas en la lente.
- Las dos apps enseñan lo mismo sin duplicar marcado (ADR 0049).
- Tests: desglose del riesgo (pesos, p95, señales ausentes), cruce de reglas por
  ruta y extremos de arista, cruces FFI y resumen de símbolos.

## Alternativas descartadas

- **Meter el dominio en `cc.json`.** Las reglas son del diff, no del código
  analizado; además cambiaría el checksum. Queda para una decisión de formato.
- **Duplicar la fórmula del riesgo en la interfaz.** Dos verdades que se
  separan a la primera de cambio.
- **Una pestaña solo de migración.** El usuario preguntó por «las lentes»: el
  riesgo y las reglas son las que explican el color del mapa.

## Hoja de ruta

### M37 - La ficha del fichero habla de sus lentes

- [x] Tercera pestaña **Lentes** en el inspector, compartida por web y escritorio.
- [x] `riskBreakdown` en `@codarch/metrics` y `RenderFile.riskParts` en el render.
- [x] Reglas de dominio por ruta desde el reporte, con severidad y `source`.
- [x] Deuda, cruces y aristas FFI por fichero desde la lente de migración.
- [x] `tab=lenses` en la URL y en las vistas guardadas de los addons.
- [x] Tests del desglose, del cruce de reglas y de los cruces FFI.
- [ ] Llevar las reglas que tocan un **símbolo** (no solo el fichero), cuando el
  reporte sepa la línea.
- [ ] Enseñar la evolución del fichero en la misma pestaña cuando el historial
  tenga más de una foto.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
