---
title: "Webapp"
description: "El mapa en el navegador: viene con el CLI y se abre con codarch serve, o sola con Docker."
section: usar
sidebar:
  label: "Webapp"
  order: 40
---

La webapp es el mapa en el navegador: el treemap, el panel VISTA con sus selectores ÁREA y COLOR, y
el inspector con sus cuatro entradas: Fichero, Carpeta, Proyecto y Cambios. **No analiza sola en el navegador**:
analiza a través de `codarch serve`, que lee el repositorio del disco y le pasa el snapshot.

## Dos formas de abrirla

### Con el CLI (la misma instalación)

`npm i -g codarch` ya trae la webapp. Se abre con:

```bash
codarch serve .
```

`serve` no es otra forma de instalar: sirve la webapp que viene con el CLI, en local, y reanaliza al
guardar. Su versión es la del CLI. Ver [`codarch serve`](cli/serve.md).

### Sola, con Docker

Sin instalar Node, con la imagen publicada y tu repo montado en solo lectura:

```bash
docker run --rm -p 127.0.0.1:4173:4173 \
  -v "$PWD":/workspace:ro \
  ghcr.io/jaminsmoke/codarch-web:latest
```

Abre `http://localhost:4173`. Dentro corre el mismo `codarch serve` sobre `/workspace`; el
contenedor escucha solo en loopback y no escribe en el repo.

Si has clonado el repositorio de CodArch, también puedes construirla y arrancarla desde él:

```bash
docker compose up --build
CODARCH_REPO=/ruta/al/repo docker compose up --build   # para mirar otro repo
```

![La webapp en http://localhost:4173 servida por el contenedor ghcr.io/jaminsmoke/codarch-web:latest con un repo montado](../images/webapp-docker.png)

## El mapa: ÁREA y COLOR

Cada bloque es una carpeta o un fichero. No hay un menú de «lentes»: son los dos selectores del panel
**VISTA**, a la izquierda.

- **ÁREA** decide el tamaño de cada bloque (la métrica).
- **COLOR** decide cómo se pinta: Riesgo, Estructura, **Lint**, Color (commits), Estado de migración,
  Deuda de migración, entre otros. Al abrir un repo, la lente por defecto es Deuda de migración.
  **Lint** pinta cada fichero con su deuda —errores + ¼ avisos— sobre el máximo del mapa, y aparece
  cuando el árbol que miras tiene lint medido: lo mide [`codarch analyze`](cli/analyze.md) en la misma
  pasada que las demás lentes, y `codarch serve` solo lo remide si el árbol cambió.

El icono de capas, en la barra de herramientas de la izquierda, pliega ese panel y deja el mapa a
pantalla completa; la app recuerda si estaba plegado.

A su lado está el botón **Docs y config**: el mapa de lo que no es código —documentos, configuración
y assets—, que tiene su propio snapshot y su propio checksum. Pulsar el botón de un mapa lo abre;
pulsar el del que ya está abierto, pliega el panel. Si el repo no trae `rest.cc.json`, el botón se ve
apagado. En ese mapa el área es el tamaño del fichero y el color es su tipo —Documentos,
Configuración, Assets u Otros—, y el bloque **Estratos** cuenta cuántos hay de cada uno. Lo que solo
habla de código —los lenguajes, los símbolos y el calor— desaparece del panel.

![El panel VISTA con los selectores ÁREA y COLOR y el mapa pintado con la lente elegida](../images/webapp-mapa-lentes.png)

Con el tema oscuro, el papel baja y las teselas conservan su color: el mapa se sigue leyendo igual
(ver [Ajustes › General](#ajustes--general)).

![El mismo mapa con el tema oscuro: papel oscuro y teselas con el color de la lente](../images/webapp-mapa-lentes-oscuro.png)

## La ruta del mapa

Encima del mapa está siempre la ruta. Sin carpeta enfocada dice solo **Todo**, que es donde estás;
al entrar en una carpeta, cada tramo se vuelve un botón: `Todo / packages / ui`. Un clic en un tramo
**selecciona** esa carpeta —su ficha aparece en el panel derecho sin mover el zoom— y con **doble
clic** entras en ella; **Todo** selecciona el mapa entero. La flecha sube un nivel y `Esc` y el
retroceso limpian la vista. La ruta navega el mapa, no describe el proyecto, y por eso vive aquí y no
en la banda de arriba.

En el mapa, un clic **selecciona** lo que hay en la celda —un fichero o una carpeta— y un **doble
clic** entra: el fichero abre su código, la carpeta hace zoom. Con el teclado, `Enter` entra y
`Espacio` selecciona. La carpeta seleccionada va en la URL con la clave `sel`; el fichero, con
`file`.

Con **doble clic** en el bloque de un fichero, el mapa deja su sitio a su código completo, de solo
lectura: la ruta pasa a ser `Todo / packages / ui / useCodarchApp.tsx` y cualquier tramo —o `Esc`, o
el botón **← Mapa** de la cabecera— devuelve el mapa. No hay pestaña ni vista aparte, y el fichero
sigue seleccionado en la ficha. El fichero abierto va en la URL con la clave `code`, así que un
enlace compartido abre ese código directamente.

## ABRIR REPOSITORIO O ARCHIVO

Es la forma principal de abrir un repositorio, aquí y en el [escritorio](escritorio.md). El botón de
la cabecera **ABRIR REPOSITORIO O ARCHIVO** abre un desplegable con estas opciones:

- **Monitorizar carpeta (live)…**: analiza la carpeta y vuelve a analizar al guardar.
- **Carpeta con .codarch…**: abre lo que ya hay en la carpeta `.codarch/` de un repo.
- **Analizar carpeta aquí…**: analiza una carpeta una vez.
- **Archivo cc.json…**: abre un snapshot suelto.
- **Copiar enlace de la vista**: copia la URL con la vista actual.

Debajo están los campos **SNAPSHOT POR URL** y **REPORTE POR URL (OPCIONAL)**, con el botón
**CARGAR POR URL**.

En el escritorio el mismo botón ofrece **Analizar carpeta…**, **Archivo cc.json…** y **Reporte JSON…**.
Solo allí hay, además, atajos de teclado (`Ctrl+O`, `Ctrl+Shift+O`) y se puede pasar la ruta como
argumento al arrancar (ver [Escritorio](escritorio.md#elige-la-carpeta-del-repositorio)).

## Inspector › Fichero

El inspector es el panel de la derecha y tiene cuatro entradas en su barra de actividad: **Fichero**,**Carpeta**, **Proyecto** y **Cambios**. Al pulsar un fichero, **Fichero** muestra sus métricas, sus
símbolos, sus dependencias entrantes y salientes y el **lint**: la salud y los hallazgos de código y de documentos que caen en esa ruta. Cada hallazgo dice de qué dominio y de qué herramienta sale. Al pulsar una carpeta, **Carpeta** muestra cuántos ficheros
tiene, en qué nivel está y qué parte de su área ocupa cada hijo, en el mismo orden que el mapa;
seleccionar un fichero vuelve a **Fichero**.

![El inspector en la pestaña Fichero con las métricas y los símbolos del fichero seleccionado](../images/webapp-inspector-fichero.png)

## Inspector › Carpeta

**Carpeta** es la hoja de la carpeta seleccionada: su ruta, sus ficheros, su nivel y su contenido,
con la parte del área que ocupa cada hijo y los ficheros que lleva dentro. Pulsar un hijo lo
selecciona —si es un fichero, pasa a **Fichero**—. Su sección **Métricas** suma el subárbol —ficheros,
carpetas, líneas, la complejidad máxima con el fichero que la tiene y la deuda de lint— y termina con
**Lint por carpeta**, una fila por carpeta hija que abre su ficha. La tabla es la del fichero, con el
mismo marco de sección y la misma tinta: el rojo de la deuda y el ocre del aviso salen del peor fichero
del subárbol, y el icono de la fila dice cuál. El **lint** de la carpeta añade los hallazgos de código y de documentos cuya ruta cuelga de ella. La frontera de dependencias y los ciclos siguen en la hoja de ruta de esta
fase.

![La hoja Carpeta abierta sobre packages/ui: su ruta, su recuento y el contenido de la carpeta con la parte del área de cada hijo](../images/webapp-inspector-carpeta.png)

## Inspector › Proyecto

**Proyecto** es la hoja del mapa entero, siempre disponible: enseña las mismas **Métricas** que la
carpeta, sumadas sobre todo el repo, y el descenso para bajar de proyecto a fichero. Métricas es la
tabla de la ficha del fichero con otro sujeto: una fila por cada métrica del snapshot —nombre, barra y
valor—, donde la barra es la parte de los ficheros que trae la métrica y el valor su suma; los
máximos —la complejidad, la función más larga— se enseñan con el fichero que los tiene, no sumados. Las
cifras llevan la misma tinta que en la ficha del fichero, con el fichero que las pone en la ayuda.
Un máximo medido a cero —sin ciclos, sin cruces de FFI— no nombra fichero: el cero es de todos, y su
ayuda lo dice. Pulsar una fila pinta el mapa por esa métrica. Debajo, el **lint** con sus totales —errores, avisos e
info, ficheros con hallazgos **de los medidos** y su score, errores + ¼ de avisos— y **Lint por
carpeta**, una fila por carpeta de primer nivel con
sus errores, avisos, info y score; pulsar una abre la ficha de esa carpeta, que cuenta lo mismo de su
subárbol. Si el artefacto se midió sobre otro árbol —el repo cambió después—, la hoja lo avisa en vez
de dar la cifra por buena.

![La sección Métricas de la hoja Proyecto: una fila por métrica con su cobertura y su valor, la complejidad más alta con su fichero y el lint con sus tres cuentas y su desglose por carpeta](../images/webapp-inspector-metricas.png)

**Docs y config** enseña el catálogo, no los hallazgos. Cada dominio lista sus sistemas: la configuración y las reglas activas cuando se conocen. Si no se pudieron enumerar —oxlint sin archivo de configuración, por ejemplo— se dice que no se sabe cuántas hay; no se pinta un cero. Una regla activa está **configurada**, no ha saltado, y por eso no lleva la tinta de la deuda. Los hallazgos de los dos dominios se leen en la vista de código, en **Fichero**, **Carpeta** y **Proyecto**, filtrados por la selección. Un artefacto anterior a la cobertura por herramienta dice que está medido con una versión anterior: no es un ámbito limpio.

Cuando la cobertura es **completa** y el árbol está al día, el bloque de lint dice **«Limpio y al día»** en proyecto, carpeta y fichero, sin la tira de ceros; si no, enseña los errores, avisos e info y el motivo. En proyecto, debajo, hay una fila por herramienta con su estado —`ok`, `medido`, `cobertura parcial` o `sin medir`—, su archivo de configuración, sus reglas activas y sus ficheros medidos. La falta de archivo de configuración de una herramienta se dice en su fila —«sin archivo de configuración: corre sus reglas por defecto y no se enumeran»— y no impide llamar limpio a lo que se midió entero.

![La hoja Proyecto: sus métricas con el lint y el lint por carpeta, y el catálogo de sistemas del repo —eslint con su configuración y sus reglas activas, oxlint sin config—](../images/webapp-inspector-proyecto.png)

Sin `.codarch/lint.repmod.json` no hay ceros: el bloque de lint dice **sin medir** y lo que pesará cuando se
ejecute [`codarch analyze`](cli/analyze.md), que lo mide con el linter del proyecto.

No hay un «riesgo del proyecto»: el riesgo está normalizado por el p95 del proyecto y es de cada
fichero, así que se lee en su ficha.

## Inspector › Cambios

La pestaña **Cambios** muestra lo que ha cambiado: lo tocado desde el último commit y, si se ha
cargado un reporte, los ficheros modificados y eliminados con sus reglas.

![La pestaña Cambios con un cambio sin confirmar en el working tree](../images/webapp-inspector-cambios.png)

## Comparar dos versiones: REPORTE POR URL

No hay una vista propia de PR ni de diff. Para comparar dos versiones:

1. Genera el reporte con el CLI:

   ```bash
   codarch diff base.cc.json head.cc.json -o reporte.json
   ```

2. Carga el snapshot de head en **SNAPSHOT POR URL** y el reporte en **REPORTE POR URL (OPCIONAL)**,
   y pulsa **CARGAR POR URL**.

El resultado aparece en la pestaña **Cambios** del inspector, con los ficheros modificados y
eliminados. Ver [`codarch diff`](cli/diff.md).

![La pestaña Cambios con el reporte de comparar express 4.x con express 5.x](../images/webapp-pr-diff.png)

## Histórico del repo

Tampoco hay una vista de historial aparte. Dentro de la pestaña **Cambios**, la sección
**Histórico del repo** muestra **MÁS TOCADOS** y **FOTOS GUARDADAS**. Se genera con:

```bash
codarch analyze --history
```

![La sección Histórico del repo con MÁS TOCADOS y FOTOS GUARDADAS](../images/webapp-historial.png)

## Ajustes

El engranaje del pie de la barra de herramientas —la franja de iconos a la izquierda del mapa— abre
**Ajustes**, con sus secciones General, Vista, Proyecto, Plugins, Addons, Actualizaciones, Componentes
y Diagnóstico.

![Ajustes con sus secciones y General abierto](../images/webapp-ajustes.png)

## Ajustes › General

**General** elige el tema de la app: **Claro**, **Oscuro** o **El sistema**. Es una preferencia de
esta máquina —no viaja en `.codarch/` ni cambia el análisis—, y las teselas del mapa conservan sus
colores: lo que cambia es el papel.

![Ajustes › General con el tema claro y las tres opciones](../images/webapp-ajustes.png)

![Ajustes › General con el tema oscuro](../images/webapp-ajustes-oscuro.png)

## Ajustes › Plugins y Ajustes › Addons

No hay una tienda ni un catálogo de plugins. **Ajustes › Plugins** lista los plugins instalados y
permite activarlos o desactivarlos (por ejemplo, «Atlas»). Los addons que declara el
`.codarch.yml` del repo están en la sección aparte **Ajustes › Addons**. Ver [Reglas](reglas.md).

![Ajustes › Plugins con «Atlas» activo](../images/webapp-plugins.png)

## Qué guarda

Las preferencias (métrica de área, modo de color) viven en el navegador; el estado del repo, en su
carpeta `.codarch/`. La webapp no sube nada a ningún servidor.

## Un mapa estático

`codarch render <snapshot> -o <carpeta>` publica la misma interfaz como sitio estático con el snapshot
en `data/`: se puede servir desde Pages o cualquier carpeta. Ver [`codarch render`](cli/render.md).

:::note[Para saber más]
Las decisiones detrás de esta página: [ADR 0044 — La app web en un contenedor local](../desarrollo/adr/0041-0050/0044-la-web-en-docker.md).
:::
