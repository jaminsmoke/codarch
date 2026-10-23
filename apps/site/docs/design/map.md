---
title: Diseño del mapa 2D
description: "Implementado: treemap 2D server-side (viewBox 1400×900), lentes Estructura / Riesgo / Métrica, búsqueda, inspector, selección de fichero y carpeta, y aristas…"
section: producto
sidebar:
  label: Diseño del mapa 2D
  order: 5
---

**Estado:** implementado en M0; desde M1 consume snapshots generados por `codarch analyze`.
**Prototipo:** [`design/map-mockup.html`](./map-mockup.html).
**Render:** `codarch render` / `codarch analyze`.

Capturas: [riesgo](./preview-riesgo.png) · [estructura](./preview-estructura.png) ·
[cambios](./preview-cambios.png) · [migración](./preview-migracion.png)

Implementado: treemap 2D server-side (`viewBox 1400×900`), lentes **Estructura / Riesgo / Métrica**,
búsqueda, inspector, selección de fichero y carpeta, y aristas salientes/entrantes del nodo
seleccionado. El HTML es único, no hace red y se genera en ~35 ms para 2.003 ficheros.

El render no analiza código: consume un `cc.json` o el `snapshot.cc.json` que produce
`codarch analyze`. Las lentes **Cambios** y **Migración** del prototipo todavía no se renderizan:
necesitan diff e historial. Tampoco se inventan hallazgos de PR; la franja superior solo muestra
hotspots, ciclos y conteos reales del snapshot.

---

## La prueba de los diez segundos

Una captura del mapa, sin interacción, tiene que responder:

1. ¿Dónde está la masa del código?
2. ¿Qué está caliente?
3. ¿Qué ha cambiado?
4. ¿Qué depende de qué?
5. ¿Qué viola la arquitectura?

Si hace falta explicar la leyenda, el diseño ha fallado.

## 1. Treemap como vista principal

- **Área = RLOC.** No LOC: los comentarios no añaden riesgo.
- **Color = una métrica**, la de la lente activa.
- **Anidación = carpetas.** Cada grupo tiene su cabecera con nombre y total.

Un grafo force-directed sería más "arquitectura", pero es peor producto: no es determinista, se
reordena en cada ejecución, deja de ser legible pasados ~200 nodos y no se puede comparar entre dos
commits. El treemap es estable, comparable y cabe en una captura.

**El coste, dicho claro:** la ciudad 3D codifica tres métricas a la vez (área, altura, color). El 2D
codifica dos. Lo compensamos con lentes, badges de delta y la inspección. Es un intercambio
deliberado: perdemos densidad visual y ganamos precisión, comparabilidad y velocidad.

## 2. Una lente cada vez

| Lente | Codificación | Pregunta | Estado |
|---|---|---|---|
| Estructura | color categórico por carpeta | ¿cómo está organizado? | M0 |
| Riesgo | secuencial, beige → rojo | ¿qué duele? | M0 |
| Métrica | secuencial según la métrica elegida | ¿dónde se concentra? | M0 |
| Cambios | divergente, azul → neutro → rojo | ¿qué se mueve? | M2 |
| Migración | categórico ts / bridge / rust | ¿cuánto queda? | M4 |

Nunca dos métricas compitiendo por el color. El conmutador de lentes **es** la gramática del
producto: la misma geometría, distintas preguntas.

## 3. Aristas solo del nodo seleccionado

Dibujar todas las dependencias produce una maraña. Aquí:

- **Salientes:** línea sólida.
- **Entrantes:** línea discontinua, apuntando al nodo seleccionado.
- **Violación de capa:** rojo, más gruesa.
- **Límite:** 8 + 8 aristas. El resto, en el inspector.

Al seleccionar `store.ts` se ve el ciclo con `http.service.ts` en rojo sin que el resto del mapa
desaparezca. Eso es lo que un grafo global no consigue.

Los self-loops se excluyen de las aristas dibujadas; la métrica `inCycle` / `cycleSize` sigue
marcando el fichero.

## 4. Los hallazgos van arriba

`1 capa violada · 2 ciclos nuevos · 3 hotspots movidos` es una franja fija, no un panel escondido.
Es la cuña del producto (PR/CI) asomando en la interfaz. Cada chip lleva a la evidencia.

En M0/M1 la franja solo muestra datos reales: hotspots, aristas cíclicas, ficheros y dependencias.
No hay hallazgos de PR hasta M2.

## 5. Color con semántica

- **Secuencial** para magnitud (riesgo).
- **Divergente** para delta (crecimiento/decrecimiento).
- **Categórico** solo para estructura y migración, con paleta apagada.
- **Nunca arcoíris.** El color es un dato, no decoración.
- **Gamma en el riesgo:** `raw^1.7`. Sin ella, casi todo salía naranja y el mapa dejaba de informar.
  Un mapa donde todo está caliente no dice nada.

Riesgo compuesto: `0.5·complejidad + 0.32·churn + 0.18·tamaño`, normalizado por p95. Si falta una
señal (por ejemplo, git no está disponible o se analiza con `--no-git`), los pesos se renormalizan
para que el máximo siga siendo 100/100 y no un 68/100 artificial.

## 6. Etiquetas

Dos líneas cuando el bloque lo permite: nombre base y extensión (`store` / `.ts`). Una línea si no.
Sin etiqueta por debajo del umbral: se resuelve con hover. La densidad de texto es el mayor riesgo
estético de un treemap.

## 7. Inspector, no dashboard

Métricas, dependencias entrantes y salientes, y la violación si existe. Nada de gráficos decorativos.
El inspector responde "¿y este fichero qué?", no "¿quieres ver un donut?".

## 8. Notas de implementación (M0/M1)

- **Área:** `rloc` por defecto; si falta, cada fichero recibe área 1 para no desaparecer. Es una
  decisión de legibilidad, no una métrica inventada: el inspector sigue mostrando el valor real.
- **Jerarquía:** las cadenas de carpetas con un solo hijo se colapsan en una cabecera
  (`app/codeCharta/features`, no tres cabeceras vacías).
- **Carpetas minúsculas:** cuando el hueco interior no permite dibujar ficheros con un píxel, la
  carpeta queda como bloque agregado. En la muestra real se dibujan 1.894 de 2.003 celdas; el resto
  sigue disponible en los datos, la búsqueda y el inspector. El zoom de la app web lo resolverá.
- **Geometría:** coordenadas enteras en el `viewBox`, bordes compartidos y `shape-rendering:
  crispEdges` para que el SVG no produzca grietas de subpíxel.
- **Etiquetas:** dos líneas (nombre + extensión) solo si caben; por debajo del umbral no se dibuja
  texto y la información queda en el hover. La muestra real produce ~100 etiquetas, no 2.000.
- **Aristas:** máximo 8 salientes + 8 entrantes; las entrantes son discontinuas. El resto se lista
  en el inspector.
- **Payload:** directorios únicos, filas compactas por fichero, celdas con rects y coordenadas
  enteras. El HTML de la muestra real queda por debajo de 500 KB.

## 9. Comparación con CodeCharta (M0)

Se comparó el mismo `samples/codecharta_visualization.cc.json.gz` con CodeCharta Visualization 2.9.0
(`area=rloc`, `height=complexity`, `color=complexity`) y con CodArch (`--area rloc --color complexity`).

| Señal | CodArch | CodeCharta |
|---|---|---|
| Ficheros | 2.003 | 2.003 |
| `rloc` | 103.577 | 103.577 |
| Aristas | 3.727 | 3.727 |
| Estructura | `app` 102,4k · `features` 51,2k | `app` 97% de ficheros · `features` visible |
| Hotspot principal | `dependencyMap.component.spec.ts` | `dependencyMap.component.spec.ts` |

Conclusiones:

- **Los totales cuadran.** La diferencia de área es solo el mínimo de 1 que damos a los 79 ficheros
  sin `rloc`; el inspector sigue mostrando el valor real.
- **Los hotspots coinciden.** Ambos mapas destacan `dependencyMap.component.spec.ts`,
  `threeSceneService.ts`, `metricColorRangeDiagram.component.ts` y `fileValidator.ts`. Nuestro
  selector de riesgo elige el mismo fichero que CodeCharta etiqueta (rloc 1.053, complejidad 9,
  riesgo 100/100).
- **La jerarquía coincide.** `app` concentra 102,4k rloc y 1.935 ficheros; `features` ~51,2k.
- **Diferencias deliberadas:** 2D frente a 3D, rampa neutra en la lente Métrica frente al verde-rojo
  de CodeCharta, y riesgo compuesto por defecto. No se detectaron defectos de datos o render.
- El porcentaje del explorador de CodeCharta es cuota de ficheros, no de área.

No se copió código ni diseño de CodeCharta; la comparación se hizo sobre el mismo `cc.json`.

## Lo que deliberadamente no hacemos

- **3D.** Lente posterior, nunca la vista por defecto.
- **Force-directed como vista principal.** Ilegible y no determinista.
- **Animaciones de layout.** El mapa debe ser comparable entre ejecuciones.
- **Un icono por lenguaje en cada bloque.** Ruido.
- **Modo oscuro en la v1.** Sí más adelante.

## La segunda vista: carriles de capas

El treemap es para explorar. Para el comentario del PR no sirve: lo que hay que enseñar es **la
violación**, no la ciudad.

Propuesta para M2: una vista de **carriles** donde cada capa es una banda horizontal, los módulos se
colocan dentro y las aristas que suben se dibujan en rojo. Es determinista, se lee en una captura de
600 px y convierte un hallazgo en una imagen accionable.

> Treemap para explorar. Carriles para decidir.

## Checklist de la captura

- [ ] Se distinguen las carpetas sin leer la leyenda.
- [ ] Hay un rojo dominante y no veinte.
- [ ] Los tres hallazgos se leen sin zoom.
- [ ] El nodo seleccionado y sus aristas se entienden sin color.
- [ ] La captura funciona en blanco y negro (contraste, no solo tono).

## Preguntas abiertas

1. **¿Riesgo compuesto o complejidad cruda por defecto?** El compuesto (complejidad + churn + tamaño)
   encuentra hotspots reales, pero es una fórmula que hay que explicar y en la que hay que confiar.
   La complejidad cruda es inmediata y honesta, pero ignora el cambio.
2. **¿Vista inicial treemap o carriles?** El treemap cuenta mejor el proyecto; los carriles cuentan
   mejor el problema.
3. **¿Aristas entrantes por defecto?** Añaden contexto (quién te usa) y ruido. En el prototipo están
   activas; quizá deban ser opt-in.
