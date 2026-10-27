---
title: "ADR 0084 — El tema de la app"
description: "La app gana un tema claro y otro oscuro, elegidos en Ajustes → General y guardados en la máquina: dos paletas de tokens, las hojas cambian de lado y los colores del mapa no se tocan."
section: desarrollo
status: aceptado
date: "2026-10-26"
sidebar:
  label: El tema de la app
  order: 84
---

**Estado:** aceptado · **Fecha:** 2026-10-26

## Contexto

La app tiene un solo tema: hojas claras y armazón oscuro. El [ADR 0082](0082-el-marco-de-la-app.md)
dejó los colores del marco en cuatro tokens precisamente para este momento, y su punto 6 dijo que el
selector no entraba ahí: era una capacidad con su ajuste y su contraste, y se decidía en su fase. La
[entrada 64 de la guía](/desarrollo/guia/#el-tema-en-ajustes) dejó las preguntas abiertas: dónde vive
la preferencia, si el escritorio sigue al sistema y cómo se comprueba el contraste.

Hay dos razones para tener tema propio y no dejarlo en manos del navegador:

- Quien trabaja de noche o en una pantalla mala no tiene cómo bajar el papel.
- Cuando el sistema va en oscuro, un navegador puede aplicar su modo oscuro forzado sobre la página.
  Ese modo apaga los grises y se lleva por delante las lentes: el cobalto, el óxido y la deuda dejan
  de significar lo mismo. Un tema propio elige los colores; no los invierte.

## Decisión

1. **El tema es una preferencia de la máquina.** Se guarda en el `localStorage` de la app con la clave
   `codarch-theme`, junto a las secciones plegadas ([ADR 0061](../0061-0070/0061-el-marco-del-proyecto.md)),
   no en `.codarch/` ([ADR 0050](../0041-0050/0050-el-repositorio-guarda-su-estado.md)). El tema no
   cambia el análisis ni viaja con el código: es cómo se mira, no qué se mira.
2. **Se elige en Ajustes → General.** Una sección nueva —la primera del diálogo— con tres opciones:
   **Claro**, **Oscuro** y **El sistema**. Sin nada guardado se sigue al sistema, y en el momento en
   que se elige una, manda la elección.
3. **El tema elegido se resuelve antes de pintar.** «El sistema» se convierte en claro u oscuro en
   cuanto se sabe la preferencia del sistema (`prefers-color-scheme`), y el resultado se escribe como
   `data-theme` y `color-scheme` en `<html>`. Así el CSS tiene un solo caso que atender y el navegador
   no decide por su cuenta: la app no se abre con un fogonazo del tema contrario, ni el modo oscuro
   automático puede volver a lavar las lentes. Las dos apps aplican el tema guardado en su `main.tsx`,
   antes de montar React —el escritorio no puede usar un script en línea, porque su CSP lo prohíbe—, y
   el gancho de React escucha los cambios del sistema mientras la opción sea «El sistema».
4. **Dos paletas completas, una por tema.** Cada tema es un bloque de tokens en `:root` y
   `:root[data-theme="dark"]`: papel, panel, tintas, filetes, acentos, marco y las piezas que hasta
   ahora estaban escritas a mano en cada regla —las hojas de los campos y las listas (`--sheet`), las
   pistas de las barras (`--track`), los velos de un fondo elegido (`--shade`), las sombras, el brillo
   del papel, las rampas de la leyenda y los colores de los estados de un símbolo—. Fuera de los dos
   bloques solo quedan los estados del marco —que ya son suyos— y el panel de código, que ya era oscuro.
5. **Las hojas cambian de lado; los datos, no.** En oscuro el papel y el panel bajan y las tintas
   suben, pero los colores con significado —las teselas del mapa, los lenguajes, los estados de
   migración, el verde y el rojo de un diff— se quedan donde están: las teselas siguen siendo claras
   sobre un papel oscuro, que es lo que conserva la lectura del mapa. Lo que sí cambia es lo que se
   dibuja sobre el papel: la retícula, el borde de las carpetas y su rótulo pasan a tokens
   (`--grid-line`, `--folder-edge`, `--folder-fill`, `--folder-ink`) para no desaparecer.
6. **El marco sigue siendo el borde.** En oscuro el armazón no se aclara: se oscurece hasta casi
   negro (`--frame`), porque lo que tiene que seguir leyéndose como borde es él, y las hojas quedan por
   dentro. La banda del proyecto conserva su tono (#1b262e), como decidió el ADR 0082.
7. **El contraste es un test.** `packages/ui/test/tema.test.ts` lee los dos bloques de `styles.css` y
   mide cada tinta sobre papel, panel y hoja. En oscuro: la tinta 14,9:1, la tinta suave 10,8:1, la
   tenue 6,6:1, los acentos entre 7,0 y 9,1:1, los estados de un símbolo entre 7,2 y 9,3:1 y el icono
   del marco en reposo 7,4:1. Un token nuevo que no pase 4,5:1 rompe la suite.

## Consecuencias

- Ajustes abre en **General**, que es lo que se cambia de la app y no del proyecto; el resto de
  secciones no se mueven.
- Las dos apps comparten el tema: el gancho vive en `@codarch/ui` y cada app solo lo conecta con su
  diálogo de Ajustes. La preferencia es de cada máquina y de cada instalación.
- El aviso de arranque (`#boot-error`), el panel de código y los estados del marco se quedan como
  estaban: ya estaban pensados sobre oscuro.
- Los plugins que dibujan su propia vista siguen leyendo los mismos tokens; los que pintan sobre
  lienzo (la vista 3D) eligen sus colores y no cambian con el tema.
- Las capturas de la webapp y del escritorio se rehacen en los dos temas: el mapa y Ajustes › General
  en cada app, y Ajustes › Actualizaciones en el escritorio. Los diálogos y menús nativos conservan
  las suyas: no cambian con el tema.

## Alternativas descartadas

- **Seguir solo al sistema, sin selector.** El sistema no siempre dice lo que se quiere: una pantalla
  concreta pide oscuro aunque el escritorio vaya en claro.
- **Guardar el tema en `.codarch/`.** El tema no es del repositorio: un compañero que abre el mismo
  proyecto no tiene por qué heredar el brillo de la pantalla de otro.
- **Invertir la página con un filtro o con `color-scheme` a secas.** Es lo que hace el modo oscuro
  automático: invierte los grises y las lentes dejan de decir lo que dicen.
- **Un tercer CSS por componente.** El tema no es una variante de cada pieza: son dos juegos de
  tokens en un solo sitio.
- **Aclarar el marco en oscuro.** Deja de leerse como borde y compite con la banda del proyecto.
- **Un tema oscuro solo para las hojas, con el marco claro.** El armazón ya es oscuro: aclararlo en el
  tema oscuro sería el mismo problema al revés.
- **Decidir el tema en el ADR 0082, de paso.** Era una capacidad con su ajuste y su contraste, y por
  eso quedó fuera.

## Hoja de ruta

### El tema de la app

- [x] Las dos paletas de tokens, con las hojas, las pistas, los velos, las sombras y las rampas.
- [x] El módulo del tema y su gancho en `@codarch/ui`, con la preferencia en la máquina.
- [x] Ajustes → General, con Claro, Oscuro y El sistema.
- [x] La web y el escritorio aplican el tema guardado antes de montar React.
- [x] La retícula y las carpetas del mapa con tokens, para que se lean sobre los dos papeles.
- [x] El contraste medido en `tema.test.ts`; un token que no pase 4,5:1 rompe la suite.
- [x] Las capturas de la webapp y del escritorio en los dos temas: mapa y Ajustes › General, además de
      Ajustes › Actualizaciones en el escritorio.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
