---
title: "La carpeta era lo único que no se podía seleccionar"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**Qué era**: un clic en un fichero del mapa lo seleccionaba para la ficha y un doble clic lo abría en el escenario. Un clic en una carpeta hacía zoom y cerraba la selección. El resultado es que la carpeta —lo que en un treemap se mira primero— era la única cosa del mapa que no se podía seleccionar: dentro de `packages/ui`, sin fichero abierto, el panel derecho decía «Selecciona una celda», como si no hubiera nada que contar de donde estabas.

**Qué se decide**: el [ADR 0092](../../adr/0091-0100/0092-la-carpeta-tiene-su-ficha.md) separa **seleccionar** de **mirar** —`sel` y `focus`— y da a la carpeta los mismos gestos que al fichero: clic selecciona, doble clic entra (el fichero al escenario, la carpeta al zoom), la miga de pan selecciona sin mover el zoom y `Enter`/`Espacio` hacen lo mismo con el cursor. La barra de actividad gana una entrada **Carpeta** con su propia hoja —se probó primero a compartir la del fichero y la entrada [104](2026-10-29-104-la-carpeta-ya-se-selecciona.md) cuenta por qué no—, y la ficha de carpeta enseña lo que la de fichero no puede: máximos **con su dueño**, composición de los hijos, frontera de dependencias —dentro, entrantes de fuera, salientes hacia fuera—, ciclos enteros y ciclos que la cruzan, reglas agrupadas por regla y los cambios acotados a la carpeta en una línea que filtra la otra pestaña.

**Por qué así**: sumar las métricas del fichero y llamarlo ficha de carpeta miente en dos sitios. Un máximo sin decir qué fichero lo tiene no es una tarea, y una arista sin distinguir dentro de fuera no dice si la carpeta es un módulo o un lío. Y las sumas y los máximos hoy no están escritos en ningún sitio: el MCP agrega en `explain_module` y la app no, con reglas que solo viven en el código del MCP. Se escriben una vez, en un módulo compartido con tests, y el MCP pasa a usarlas —la misma lección del [ADR 0091](../../adr/0091-0100/0091-el-mapa-en-una-captura.md), donde el color se resolvía en un solo sitio para que la pantalla y la captura no pudieran pintar distinto—.

**Lo que se paga**: el clic simple deja de navegar, que era una decisión del [ADR 0085](../../adr/0081-0090/0085-la-ruta-del-mapa-navega.md). La navegación no desaparece: cambia de gesto y gana la miga seleccionable. A cambio, la carpeta seleccionada necesita marca propia, distinta del cursor de teclado y del hover, o el clic deja de decir qué hay abierto en el panel.

**Veredicto**: fase **M63**, sin empezar. La primera rebanada es la barata y la que cambia la sensación: `sel` en el estado y la URL, selección de carpeta y sus tres marcas. La frontera y los ciclos van después, porque son las que piden la agregación compartida ya probada.
