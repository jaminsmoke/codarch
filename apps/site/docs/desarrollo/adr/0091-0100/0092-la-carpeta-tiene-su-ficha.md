---
title: "ADR 0092 — La carpeta tiene su ficha"
description: "Seleccionar y navegar pasan a ser dos cosas distintas: clic selecciona un fichero o una carpeta y doble clic entra —el fichero al escenario, la carpeta al zoom—. La barra del inspector gana la entrada Carpeta, con su propia hoja: máximos con su dueño, frontera, ciclos dentro y a través, reglas agrupadas y los cambios acotados, con las reglas de agregación escritas una vez y compartidas con el MCP."
section: desarrollo
status: aceptado
date: "2026-10-29"
sidebar:
  label: La carpeta tiene su ficha
  order: 92
---

**Estado:** aceptado · **Fecha:** 2026-10-29

## Contexto

El panel derecho tiene dos vistas: la ficha del fichero y los cambios
([ADR 0079](0081-0090/0079-el-inspector-con-barra-de-actividad.md)). La ficha es del fichero, y solo
del fichero.

En el mapa, un clic en un fichero lo selecciona y un doble lo abre en el escenario
([ADR 0087](0081-0090/0087-el-fichero-entero-en-el-escenario.md)); un clic en una carpeta la enfoca y
cierra la selección ([ADR 0085](0081-0090/0085-la-ruta-del-mapa-navega.md)). La consecuencia es que
**la carpeta es lo único del mapa que no se puede seleccionar**: dentro de `packages/ui`, sin fichero
abierto, el panel dice «Selecciona una celda». El estado «estoy en esta carpeta» no cuenta nada, y es
la pregunta que más se hace en un treemap: ¿esto es grande?, ¿de qué depende?, ¿dónde se rompen las
reglas?

El modelo ya sabe agregar una carpeta —el MCP lo hace en `explain_module`, con tamaño = suma,
complejidad = máximo y riesgo = máximo— y la app no lo enseña. Peor: esas sumas y esos máximos no
están escritos en ningún sitio como regla, así que dos superficies pueden contar cosas distintas del
mismo snapshot.

El zoom a carpeta, en cambio, sigue haciendo falta: es cómo se recorre el árbol.

## Decisión

### 1. Seleccionar y mirar son dos cosas distintas

`focus` dice dónde estás mirando; `sel`, qué tienes abierto en el panel. Hoy solo existe la primera
porque solo los ficheros se seleccionan. La selección no mueve el mapa; el foco sí. Separarlas es lo
que permite comparar dos carpetas hermanas sin salir de donde estás.

### 2. Los gestos son los mismos para un fichero y para una carpeta

- **Clic**: selecciona. Fichero o carpeta, y la ficha cambia de sujeto.
- **Doble clic**: entra. Un fichero, al escenario con su código (ADR 0087, sin cambios); una carpeta,
  al zoom que hoy hace el clic simple.
- **La miga de pan**: cada tramo selecciona esa carpeta sin mover el zoom, para mirar un padre sin
  salir de donde estás, y con doble clic entra —la misma regla que en el mapa—. «Todo» selecciona el
  mapa entero.
- **`Enter`** entra y **`Espacio`** selecciona; `Esc` sigue limpiando foco, fichero abierto y
  selección. Las flechas no cambian: siguen moviendo el cursor entre celdas.

Esto enmienda el [ADR 0085](0081-0090/0085-la-ruta-del-mapa-navega.md) en un punto: el clic simple
deja de navegar. La navegación no desaparece, cambia de gesto y gana la miga.

### 3. Tres entradas en la barra: fichero, carpeta y cambios

La carpeta tiene su propia entrada en la barra de actividad (ADR 0079), entre Fichero y Cambios, y
su propia hoja. No comparte la hoja del fichero: de las siete secciones del fichero le quedan dos
—la cabecera y el contenido— y las otras serían mentira o estarían vacías. Además, la entrada dice
qué se puede mirar sin saber qué hay seleccionado; una hoja que cambia de sujeto esconde su propia
puerta.

Seleccionar una carpeta abre su hoja. Seleccionar un fichero con la hoja de la carpeta abierta
vuelve a la del fichero. Cambios no se mueve si no se pide: pulsar una celda no cambia de apartado
por su cuenta (ADR 0069).

### 4. Qué enseña la ficha de carpeta

- **Cabecera**: nombre, ruta, número de ficheros, profundidad y qué parte del padre representa, con su
  puesto entre las hermanas.
- **Métricas agregadas**, con la regla a la vista: área, líneas y deuda suman; complejidad y riesgo son
  **máximos y dicen en qué fichero están**. Un máximo sin dueño no es una tarea.
- **Composición**: hijos directos por área con su porcentaje y los lenguajes presentes. Es lo que en el
  fichero son los miembros.
- **Frontera**: dependencias internas, entrantes desde fuera y salientes hacia fuera, con los ficheros
  externos que las sostienen. No existe a nivel de fichero y es lo que dice si la carpeta es un módulo
  o un lío.
- **Ciclos**: los que caen enteros dentro —se arreglan dentro— y los que la cruzan, que piden a otro.
- **Reglas**: agrupadas por regla con su cuenta y los ficheros dentro de cada grupo. A esta escala se
  ve el patrón; a escala de fichero solo hay incidentes.
- **Cambios**: una línea con la cuenta que lleva a la pestaña de cambios **acotada a esa carpeta**. No
  se duplica la lista.

No lleva símbolos, miembros, código ni cadena de símbolo: una carpeta no tiene cuerpo, y para llegar a
un símbolo se entra.

### 5. Las sumas y los máximos se escriben una vez

Una función pura en un módulo compartido, con sus tests: área, líneas y deuda suman; complejidad y
riesgo son el máximo **con su dueño**; los commits no se suman —un commit que toca veinte ficheros
contaría veinte—, así que la ficha enseña los ficheros más tocados y no un total. El MCP pasa a usar
esa misma función en vez de su copia, para que la app y el agente no digan cifras distintas del mismo
snapshot. Es la misma regla que el [ADR 0091](0091-0100/0091-el-mapa-en-una-captura.md) fijó para los
colores: una sola fuente.

### 6. La selección viaja

`sel` en la URL, separada de `focus`
([ADR 0018](0011-0020/0018-estado-vista-en-la-url.md), [ADR 0088](0081-0090/0088-el-fichero-abierto-va-en-la-url.md)):
así una ficha de carpeta se puede enlazar. `sel` lleva la carpeta y `file` sigue llevando el
fichero: la selección es una sola cosa, pero cada clave dice lo que siempre dijo y los enlaces
viejos no cambian de significado. Se limpia al cargar otro snapshot, como la selección de hoy.

### 7. Tres estados, tres marcas

Seleccionado, cursor de teclado y hover tienen que distinguirse. Hoy `is-cursor` marca el cursor y el
fichero seleccionado lleva el trazo grueso; la carpeta seleccionada necesita su marca propia o el clic
deja de decir qué hay abierto en el panel.

## Consecuencias

- Cambia un gesto que ya estaba decidido: quien entraba con un clic tiene el doble clic y la miga. Se
  paga con una nota en la ayuda y con la marca de selección, que es lo que hace evidente que el clic
  ya no navega.
- El panel deja de estar vacío dentro de una carpeta: el estado «sin selección» queda para el mapa
  entero.
- La agregación pasa a ser una pieza con tests, y el MCP cambia de implementación sin cambiar de
  contrato.
- La URL gana una clave, y las capturas que enseñan una carpeta enfocada sin selección quedan viejas.
- La agregación se calcula una vez por snapshot y se memoiza por ruta; nunca por frame.
- La barra gana una entrada, y la hoja de carpeta tiene que leerse como la del fichero —secciones
  plegables con su cuenta— aunque las secciones no sean las mismas.

## Alternativas descartadas

- **Meter la carpeta en la hoja del fichero, con el sujeto cambiando detrás de la misma entrada.** Es
  lo que se hizo primero y estaba mal: dos fichas que no comparten secciones, un botón que promete
  una cosa y enseña otra, y un panel que parece vacío al volver a Fichero con una carpeta
  seleccionada. La hoja es propia y la barra tiene tres entradas.
- **Que el clic seleccione y además haga zoom.** Se pierde la vista de conjunto justo cuando se
  comparan hermanas.
- **La ficha de fichero con las métricas sumadas.** Los máximos sin dueño y las aristas sin dentro y
  fuera dicen cosas falsas.
- **Seleccionar la carpeta solo desde el árbol lateral.** El mapa es donde está el contexto visual; el
  árbol ya navega.
- **Sumar commits para tener un número de calor.** Sobrecuenta sin decirlo.

## Hoja de ruta

- ✅ `sel` en el estado y en la URL, con la selección de carpeta y sus tres marcas.
- ✅ Los gestos: clic selecciona, doble clic entra, la miga selecciona, `Enter` y `Espacio`.
- ✅ La agregación compartida, con sus tests ([ADR 0095](0095-la-ficha-del-proyecto.md)).
- 🟡 La ficha: cabecera, contenido y **Métricas** con la complejidad máxima y su fichero; falta el
  riesgo máximo con dueño.
- ⬜ Frontera y ciclos dentro y a través.
- ⬜ Reglas agrupadas por regla.
- ⬜ Los cambios acotados: el enlace de la ficha filtra la pestaña.
- ⬜ El MCP usa la agregación compartida en vez de su copia.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
