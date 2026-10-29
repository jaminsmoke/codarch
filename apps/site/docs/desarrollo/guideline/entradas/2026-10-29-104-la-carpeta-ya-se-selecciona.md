---
title: "La carpeta ya se selecciona"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: un clic en una carpeta del mapa hacía zoom y cerraba la selección, así que dentro de una carpeta el panel derecho decía «Selecciona una celda» aunque hubiera cuarenta ficheros a la vista. La única forma de leer algo era abrir un fichero.

**Qué cambia**: la primera rebanada del [ADR 0092](../../adr/0091-0100/0092-la-carpeta-tiene-su-ficha.md) ya está en la app. La selección vive en su propio estado y en su propia clave de la URL —`sel`, al lado de `focus` y de `file`—, y el gesto es el mismo para un fichero y para una carpeta: **un clic selecciona, un doble clic entra**. La miga de pan selecciona el tramo sin mover el zoom y con doble clic entra; «Todo» selecciona el mapa entero. Con el teclado, `Enter` entra y `Espacio` selecciona. La carpeta seleccionada tiene su marca —trazo de tinta, más grueso que el marco—, distinta del cursor de teclado (rojo) y del hover. Y la ficha cambia de sujeto: con una carpeta seleccionada enseña su ruta, sus ficheros, su nivel y su contenido en el orden del treemap, con la parte del área que ocupa cada hijo.

**Por qué así**: `sel` va en clave aparte de `file` porque `file` lleva años significando «el fichero» y los enlaces que ya están pegados en tickets tienen que seguir abriendo lo mismo. `Enter` entra y `Espacio` selecciona porque las flechas ya mueven el cursor: la hoja de ruta del ADR decía `→` para entrar, y eso habría chocado con la navegación espacial del [ADR 0085](../../adr/0081-0090/0085-la-ruta-del-mapa-navega.md); se corrige allí. En la miga, el doble clic conserva la navegación que el clic ya no hace, con la misma regla que en el mapa.

**Lo que se paga**: quien entraba en una carpeta con un clic ahora necesita el doble clic, la miga o la flecha ←. Se paga con la marca de selección, que es lo que hace evidente que el clic ya no navega.

**Lo que falta**: la ficha de carpeta está a medias. La cabecera y el contenido están; faltan las métricas agregadas **con su dueño** y, antes que ellas, la agregación compartida con el MCP (los máximos y las sumas escritos una vez), la frontera de dependencias, los ciclos dentro y a través, las reglas agrupadas y el enlace que acota Cambios a la carpeta.

**Veredicto**: fase **M63**, en curso. Los dos primeros pasos de su hoja de ruta, hechos.
