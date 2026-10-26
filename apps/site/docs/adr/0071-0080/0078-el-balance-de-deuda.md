---
title: "ADR 0078 — El balance de deuda"
description: "La deuda deja de estar en dos sitios: una sección Balance de deuda reúne las cifras, los ficheros cuya deuda se movió —con las barras del raíl— y los que más crecieron, y no desaparece con el árbol limpio."
section: adr
status: aceptado
date: "2026-10-26"
sidebar:
  label: El balance de deuda
  order: 78
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

La pestaña **Cambios** habla de deuda en dos sitios a la vez. La sección **Migración** (ADR 0072) trae
las cifras —deuda `base → head`, cruces FFI, lenguajes nativos— y los ficheros cuya deuda ha subido o
bajado. Los **Hotspots** (ADR 0072 los metió en **Ficheros** para que la pestaña cupiera) son los
ficheros que más crecieron en la métrica del reporte, `maxComplexity` por defecto.

Y son lo mismo visto desde dos lados: la deuda de migración es `(maxComplexity + 1) × (1 + fanIn)` por
fichero TS/JS. Si un fichero sube de deuda, casi siempre es porque su complejidad ha subido; si la
métrica crece, la deuda que viene detrás también. Separados, para contestar «¿por qué ha subido la
deuda?» hay que leer una sección y después buscar los mismos ficheros en otra.

Además **Ficheros** mezcla dos preguntas: qué ficheros se tocaron (su lista, ADR 0070) y cuáles
crecieron más en una métrica (los hotspots). La fila ya cuenta una cosa —estado, ruta y un total— y su
desplegable otra —símbolos y diff— (ADR 0077): un tercer eje dentro del mismo grupo sobra.

Y la deuda tiene una cuarta boca: el raíl del mapa, donde **Deuda de migración** lista los ficheros
con más deuda y los barra. Es una foto sin diff, al lado del mapa, que se lee antes de saber si algo
se movió; los mismos datos, contados otra vez y peor.

## Decisión

1. **Una sección, Balance de deuda.** Va después de **Ficheros** y reúne lo que estaba partido: la
   línea de cifras del cambio —deuda `base → head`, cruces FFI, ficheros nativos— y sus grupos,
   **Diffs de deuda** y **Hotspots**.
2. **Diffs de deuda** son los ficheros cuya deuda de migración se movió: primero los que suben y
   después los que bajan, con su `before → after` y el delta. El corte es de seis por sentido y ahora
   lo dice con `+N más`: antes se recortaba en silencio.
3. **Las barras vienen del raíl.** Cada fila del balance lleva, debajo, una barra con la magnitud del
   movimiento, en la escala del mayor de su grupo: el vistazo que daba la lista del mapa, con el color
   del signo —rojo si sube, verde si baja— y el número del diff al lado. **Diffs de deuda** y
   **Hotspots** usan la misma fila: son dos lecturas del mismo peso y se leen igual, cada grupo con su
   propia escala. El raíl pierde su bloque **Deuda de migración**: una sola boca para la deuda, la que
   tiene los cambios.
4. **Hotspots sale de Ficheros.** **Ficheros** vuelve a ser la lista pura de nuevos, modificados y
   eliminados; el crecimiento de una métrica no es un estado del fichero ni un cuarto grupo.
5. **La sección se lee plegada.** Su resumen es `deuda 8,8k → 9k · 8 hotspots`: el dato que importa
   sin abrir nada, como el resto de secciones.
6. **Lo que no hay no se inventa.** Un reporte sin lente de migración deja el balance solo con los
   hotspots —sin una deuda a cero—, y un fichero sin deuda medida no entra en los diffs.
7. **Los títulos no desaparecen.** La pestaña ya no cambia de forma cuando el árbol está limpio: se
   avisa de que coincide con su último commit y se pintan **Ficheros**, **Balance de deuda**,
   **Ciclos nuevos** e **Histórico** con sus títulos. Lo que falta son los valores, y cada grupo dice
   en una línea por qué está vacío (`La deuda no se ha movido`, `Sin ciclos nuevos`). Antes, un push
   o un árbol limpio escondía la pestaña entera.
8. **Más tocados cambia de sitio.** La lista de los ficheros con más commits deja el raíl y pasa a
   **Histórico del repo**, junto a las fotos: cuenta lo que el repo lleva hecho, no lo que el árbol
   tiene ahora. El raíl se queda con las herramientas del mapa —**Vista**, **Estratos**, **Leyenda** y
   **Más reescritos**—. Un `cc.json` suelto, sin git, no tiene cambios con los que comparar: su estado
   vacío recupera la lista, y con reporte no se repite.

## Consecuencias

- La pestaña pierde una sección y gana otra: **Migración** desaparece como nombre y su contenido pasa
  a **Diffs de deuda** dentro de **Balance de deuda**.
- Las dos lecturas del peso se leen juntas: la deuda que se mueve y la métrica que la mueve.
- **Ficheros** queda con un solo eje y una sola clase de fila.
- El raíl del mapa pierde dos bloques: **Deuda de migración** se va con su componente y su export, y
  **Más tocados** se muda a **Histórico del repo**. La deuda se mira en **Cambios**, con el diff
  delante. El CSS de las barras se queda para las listas cortas —`.mini-*`, compartido con **Más
  reescritos**—. El mapa sigue coloreando por deuda y la ficha del fichero sigue contando la suya.
- Un snapshot sin git conserva **Más tocados** en el estado vacío de **Cambios**: es la única ventana
  donde la lista puede verse sin reporte, y con reporte no se duplica.
- La pestaña deja de esconderse: con el árbol limpio se leen sus cuatro secciones, y cada una dice
  qué le falta. Un push ya no borra la pestaña.
- El histórico espera a saber si hay fotos antes de pintarse: no enseña un vacío que un segundo
  después tiene filas.
- Tests: el reparto del balance (cifras, subidas y bajadas), el delta de cada fila con su escala, la
  escala propia de los hotspots, los ficheros más tocados con su orden estable, el corte con su
  resto, un reporte sin lente y el resumen con una mitad vacía.

## Alternativas descartadas

- **Dejarlo como está: Migración por un lado y Hotspots en Ficheros.** Es lo que había y obliga a
  recorrer dos sitios para responder la misma pregunta.
- **Llamar «deuda» a los hotspots.** La métrica puede ser `rloc`, que no es deuda de migración; el
  grupo se queda con su nombre y la sección dice por qué están ahí.
- **Un cuarto grupo de hotspots dentro de Ficheros.** Repite la fila y compite con el desplegable de
  símbolos y diffs que acaba de llegar (ADR 0077).
- **Dejar la lista de deuda en el raíl y quitar la del panel.** Es la foto de siempre, pero sin el
  diff: no dice qué se movió, que es lo que se viene a ver en **Cambios**.
- **Un tercer grupo con los que más deben ahora.** Repite lo que ya dicen los diffs, solo que sin
  movimiento, y alarga una sección que se lee en una pantalla.

## Hoja de ruta

### M59 — Balance de deuda

- [x] `debtBalance` y su resumen: cifras, subidas, bajadas, resto, escala y hotspots.
- [x] La sección **Balance de deuda** con sus dos grupos, después de Ficheros.
- [x] Los hotspots fuera de Ficheros; el corte de deuda con su `+N más`.
- [x] Las barras del raíl, dentro de cada fila del balance, con el color del signo y la escala de su
  grupo.
- [x] **Deuda de migración** sale del raíl del mapa: se van el componente y su export; el CSS de las
  barras se queda con las otras listas cortas.
- [x] **Más tocados** pasa del raíl a **Histórico del repo**, con sus filas y su barra, y el título de
  la sección se queda aunque no haya fotos.
- [x] Un `cc.json` sin git lo recupera en el estado vacío de **Cambios**, sin duplicarlo cuando hay
  reporte.
- [x] Títulos fijos: la pestaña no desaparece con el árbol limpio y cada grupo explica su vacío.
- [x] Tests del reparto, del delta y su escala, de la escala de los hotspots, de los más tocados, del
  corte y de la falta de lente de migración.
- [x] Comprobado en la app servida: con cambios, los dos grupos y las barras; con el árbol limpio,
  las cuatro secciones y sus mensajes.

El registro de lo hecho vive en el [feed de la guía](/guia/).
