---
title: "La duplicación entra en el mapa"
date: "2026-10-31"
category: "feature"
verdict: "fase"
---

**Qué era**: la lente de duplicación ya estaba medida en el snapshot (M68), pero solo la veía quien
abría el JSON. El mapa podía pintarse con `duplicatedLines`, y aun así la ficha del fichero no decía
cuántas líneas eran ni con quién se compartían, y las hojas de carpeta y proyecto no tenían una cifra
propia.

**Qué cambia**: el modelo cruza la lente con los ficheros una sola vez (`model-duplication`) y las tres
fichas leen lo mismo. El fichero gana **Duplicación**: líneas duplicadas, repetidas, proporción sobre su
`rloc`, el gemelo si es copia literal y sus pares con la similitud y las líneas. La carpeta y el
proyecto suman líneas y dividen **una vez** por el `rloc` del subárbol. El color `duplicatedLines` se
acepta aunque falte la lente —como el lint— para que un enlace no caiga al riesgo en silencio: la banda
dice «sin duplicación medida» y la leyenda cuenta ficheros y pares. `codarch shot` pinta el mismo color
con la misma escala, porque el PNG y la app salen del mismo modelo.

**Por qué así**: sumar porcentajes diría una cifra que no existe. Las líneas sí se suman y la
proporción se calcula al final, que es la regla del propio resumen del snapshot. La duplicación no se
funde con la deuda de migración: son dos lecturas y se enseñan al lado (ADR 0102). El aviso separa «no
hay copias» de «no se miró», que es la misma distinción que el lint ya hace con su artefacto.

**Verificado**: la suite completa queda en **176 ficheros y 1533 tests**. Tests nuevos del modelo (la
lente cruzada, los pares desde los dos lados, la escala y un snapshot sin lente), de la captura (color,
leyenda y valor de la celda), de las tres fichas (proporción del fichero, suma del proyecto y de la
carpeta, «sin medir») y del aviso de la banda. Typecheck y lint limpios y el sitio construido.

**Veredicto**: hecho. M69 cierra; quedan M70 (la divergencia con nombre) y M71 (el diff).
