---
title: ADR 0060 — La ficha del fichero se lee en una tabla
description: "Las métricas del fichero pasan a una sola tabla: fuera la rejilla duplicada, la barra llega al p95, el color solo aparece cuando menos es mejor, el área es una marca y cada fila pinta el mapa."
section: adr
status: aceptado
date: "2026-10-25"
sidebar:
  label: La ficha se lee en una tabla
  order: 60
---

**Estado:** aceptado · **Fecha:** 2026-10-25

## Contexto

La pestaña **Fichero** enseñaba las métricas dos veces. Arriba, una rejilla de
seis celdas: área, riesgo, complejidad, churn, deuda y cruces FFI. Abajo, una
lista de hasta diez métricas. Solo el **riesgo** era nuevo: el área repetía la
métrica que decide el tamaño del mapa, la complejidad era `maxComplexity`, el
churn era `number_of_commits`, y la deuda y los cruces eran `migrationDebt` y
`ffiCrossings`.

La lista no era solo redundante: **escondía** lo interesante. Cortaba en diez
filas y, con el orden del modelo, se quedaba justo antes de fan-in, fan-out,
ciclos, nivel de dependencia, commits, deuda y cruces. La rejilla tapaba el
agujero, pero a costa de repetir. Y los valores eran planos: el mismo peso y el
mismo color dieran 3 o 300, así que había que leerlos uno a uno para saber cuál
pesaba.

## Decisión

La ficha del fichero tiene **una sola tabla de métricas** (M40).

1. **El riesgo va primero**, porque es la lectura del mapa. No es una métrica
   del snapshot: se deriva de complejidad, churn y tamaño.
2. **Ninguna métrica se repite.** El área deja de ser una fila: es una marca
   `área` en la métrica que decide el tamaño del mapa (por defecto, líneas de
   código). El desglose del riesgo se queda en Reglas, donde se explica.
3. **Sin tope y con orden fijo.** Se enseña cada métrica que trae el modelo, en
   el mismo orden siempre: tamaño, complejidad, churn, dependencias, migración e
   imports. La posición de una fila es su sitio; así se compara de un vistazo
   entre ficheros. Lo que el fichero no tiene se enseña como `—`, apagado.
4. **Compacta y con peso.** Filas de unos 22 px, números tabulares alineados a
   la derecha y una barra por fila. La tabla es algo más alta que la rejilla y
   la lista juntas —veinte filas frente a dieciséis, cinco repetidas—, pero
   cabe en la columna y no deja ninguna métrica fuera.
5. **La barra llega al p95, no al máximo.** Un solo fichero enorme no debe
   aplastar las barras del resto. En las métricas logarítmicas se usa la misma
   escala que el mapa. Si el p95 es 0, la referencia es el máximo real.
6. **El color solo significa algo cuando «menos es mejor»** (`direction` -1):
   hasta el 75 % del p95, neutro; del 75 % al p95, ocre; en el p95 o por encima,
   deuda. El riesgo tiene su semáforo: 40 y 70 sobre 100. Las métricas sin
   dirección (funciones, autores, nivel) o con «más es mejor» (fan-in) se quedan
   en tinta: pintarlas de verde sería afirmar una salud que no medimos. El
   gradiente continuo se queda en el mapa; con él, cada barra tendría un color
   distinto y el estado desaparecería.
7. **Cada fila pinta el mapa.** Pulsar «Complejidad máx.» colorea el mapa por
   esa métrica; pulsar «Riesgo» vuelve al riesgo. La fila activa queda marcada
   y con `aria-pressed`. La tabla deja de ser un cuadro de lectura y pasa a ser
   un instrumento.
8. **El tooltip cuenta la escala**: mínimo, p95, máximo real y cobertura. Una
   nota al pie explica la barra y la fila pulsable.

Para que la deuda y los cruces tengan p95 aunque no sean el modo de color,
`migrationDebt` y `ffiCrossings` pasan a ser **métricas curadas del modelo**
(`RenderModel`). Antes solo entraban al elegirlas para pintar el mapa.

**Lo que no cambia:** ni `cc.json`, ni el checksum, ni el `report.json`, ni las
reglas. Todo sale del snapshot que ya existía.

## Consecuencias

- La pestaña Fichero enseña unas veinte filas únicas; es algo más alta que
  antes, pero cabe en la columna y no esconde métricas.
- El color de la tabla es discreto y semántico; el del mapa sigue siendo
  continuo. Son dos lenguajes con dos trabajos: estado y magnitud.
- Pulsar una fila cambia el modo de color del mapa, la URL y las preferencias.
- Los umbrales viven en una sola función (`metricState`, `riskState`), con
  tests de dirección, p95 = 0, escala log y valores ausentes.
- Un fichero sin una métrica enseña `—`, sin barra y sin color. La tabla no
  cambia de forma por un dato que falta.
- Sigue abierto el orden por familias con separadores si la lista crece, y
  llevar este lenguaje a la tabla del reporte.

## Alternativas descartadas

- **Mantener la rejilla y la lista.** Es el problema: duplicar para que la
  lista corta no se note.
- **Pintar las barras con el gradiente del mapa.** Cada barra saldría de un
  color distinto y el ojo perdería el estado; el gradiente ya está en el mapa.
- **Normalizar por el máximo.** Un fichero generado o un `config` enorme deja
  las demás barras en nada.
- **Ordenar por valor.** Rompe la comparación entre ficheros: la fila cambia de
  sitio y el ojo tiene que buscarla.
- **Seguir cortando en diez.** Es lo que escondía fan-in, ciclos, churn y
  migración.
- **Pintar también las métricas sin dirección de deuda.** Un fan-in alto o
  muchas funciones no son ni buenos ni malos; el color afirmaría lo contrario.

## Hoja de ruta

### M40 - Una tabla de métricas

- [x] Una sola tabla, sin rejilla ni lista duplicadas.
- [x] El riesgo primero y el área como marca, no como fila.
- [x] Orden fijo, sin tope y con `—` para lo que falta.
- [x] Barra hasta el p95, con la escala del mapa y el caso p95 = 0.
- [x] Color de estado solo cuando menos es mejor; riesgo con 40 y 70.
- [x] Cada fila pinta el mapa y la activa queda marcada.
- [x] Deuda y cruces como métricas curadas del modelo, con su p95.
- [ ] Agrupar imports bajo un pliegue si la tabla crece con métricas nuevas.

Llevar esta tabla a **Cambios** y a la ficha del símbolo es la M49
([ADR 0061](../0061-0070/0061-el-marco-del-proyecto.md#hoja-de-ruta)).

El registro de lo hecho vive en el [feed de la guía](/guia/).
