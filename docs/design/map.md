# Diseño del mapa 2D

**Estado:** propuesta · **Prototipo:** [`design/map-mockup.html`](../../design/map-mockup.html)

Capturas: [riesgo](../../design/preview-riesgo.png) · [estructura](../../design/preview-estructura.png) ·
[cambios](../../design/preview-cambios.png) · [migración](../../design/preview-migracion.png)

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

- **Área = SLOC.** No LOC: los comentarios no añaden riesgo.
- **Color = una métrica**, la de la lente activa.
- **Anidación = carpetas.** Cada grupo tiene su cabecera con nombre y total.

Un grafo force-directed sería más "arquitectura", pero es peor producto: no es determinista, se
reordena en cada ejecución, deja de ser legible pasados ~200 nodos y no se puede comparar entre dos
commits. El treemap es estable, comparable y cabe en una captura.

**El coste, dicho claro:** la ciudad 3D codifica tres métricas a la vez (área, altura, color). El 2D
codifica dos. Lo compensamos con lentes, badges de delta y la inspección. Es un intercambio
deliberado: perdemos densidad visual y ganamos precisión, comparabilidad y velocidad.

## 2. Una lente cada vez

| Lente | Codificación | Pregunta |
|---|---|---|
| Estructura | color categórico por carpeta | ¿cómo está organizado? |
| Riesgo | secuencial, beige → rojo | ¿qué duele? |
| Cambios | divergente, azul ← neutro → rojo | ¿qué se mueve? |
| Migración | categórico ts / bridge / rust | ¿cuánto queda? |

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

## 4. Los hallazgos van arriba

`1 capa violada · 2 ciclos nuevos · 3 hotspots movidos` es una franja fija, no un panel escondido.
Es la cuña del producto (PR/CI) asomando en la interfaz. Cada chip lleva a la evidencia.

## 5. Color con semántica

- **Secuencial** para magnitud (riesgo).
- **Divergente** para delta (crecimiento/decrecimiento).
- **Categórico** solo para estructura y migración, con paleta apagada.
- **Nunca arcoíris.** El color es un dato, no decoración.
- **Gamma en el riesgo:** `raw^1.7`. Sin ella, casi todo salía naranja y el mapa dejaba de informar.
  Un mapa donde todo está caliente no dice nada.

## 6. Etiquetas

Dos líneas cuando el bloque lo permite: nombre base y extensión (`store` / `.ts`). Una línea si no.
Sin etiqueta por debajo del umbral: se resuelve con hover. La densidad de texto es el mayor riesgo
estético de un treemap.

## 7. Inspector, no dashboard

Métricas, dependencias entrantes y salientes, y la violación si existe. Nada de gráficos decorativos.
El inspector responde "¿y este fichero qué?", no "¿quieres ver un donut?".

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
   encuentra Hotspots reales, pero es una fórmula que hay que explicar y en la que hay que confiar.
   La complejidad cruda es inmediata y honesta, pero ignora el cambio.
2. **¿Vista inicial treemap o carriles?** El treemap cuenta mejor el proyecto; los carriles cuentan
   mejor el problema.
3. **¿Aristas entrantes por defecto?** Añaden contexto (quién te usa) y ruido. En el prototipo están
   activas; quizá deban ser opt-in.
