---
title: El marco de la app
date: "2026-10-26"
category: fix
verdict: adr
---

**Qué era**: la barra de actividad del inspector (ADR 0079) tenía el color de las hojas. Entre la hoja clara y el canto de la ventana quedaba una tira de 44 px que no decía de quién era: el armazón —cabecera y banda del proyecto— se cortaba en la esquina, y a un vistazo la franja se leía como un resto del panel. Los colores del armazón, además, estaban escritos a mano en cada regla.

**Qué cambió**: la barra comparte el color de la cabecera (`--frame`, #121a20) y la pleca de la junta con la hoja es la misma que la cabecera lleva abajo (`--frame-edge`), así que el marco cierra por el borde derecho. La banda del proyecto se queda con su tono: es una banda de cifras, no el borde de la app. Sobre oscuro los estados se invierten —reposo en #93a2a8, blanco al pasar el ratón, el activo con un 10 % de blanco y la marca interior en claro—, y el punto de «hay cambios sin commitear» se queda igual. Los colores del armazón pasan a cuatro tokens (`--frame`, `--frame-ink`, `--frame-muted`, `--frame-edge`) de los que tira también la cabecera: un tema nuevo será cambiar cuatro valores. No se toca ningún acento, ni el ancho de la barra, ni sus botones de 32 px.

**Números**: medido en la app servida, a 1400 × 860: la barra va de 116 a 860 —744 px, del borde de la banda al pie— con fondo #121a20 y la junta en #05090c; el contraste es 6,6:1 en reposo, 15,9:1 en el apartado activo y 4,7:1 en el punto rojo. La cabecera no cambia de píxel: usa los tokens con los valores que ya tenía. Sin dependencias nuevas y sin cambios en el modelo ni en la API.

**Veredicto**: [ADR 0082](../../adr/0081-0090/0082-el-marco-de-la-app.md), hecho. Deja abiertos el tema en Ajustes → General —anotado como idea— y las capturas que enseñan el inspector.
