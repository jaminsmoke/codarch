# ADR 0008 — Diseño del mapa 2D

**Estado:** aceptado · **Fecha:** 2026-10-20

## Contexto

El mapa es la interfaz principal del producto. Había que decidir la geometría, la codificación del
color y el orden de las vistas antes de escribir el renderer.

Se construyó un prototipo navegable (`design/map-mockup.html`) con cuatro lentes y datos sintéticos
con forma de CodeCharta. El diseño completo está en [`docs/design/map.md`](../design/map.md).

## Decisiones

1. **Treemap como vista principal.** Área = SLOC, color = una métrica, anidación = carpetas. Es
   determinista, comparable entre commits y legible en una captura.
2. **Riesgo compuesto por defecto.** `0,5·complejidad + 0,32·churn + 0,18·tamaño`, con gamma `^1.7`
   para que solo los outliers se enciendan.
3. **Aristas bajo demanda.** Al seleccionar un nodo: salientes sólidas, entrantes discontinuas,
   violación de capa en rojo. Límite de 8 + 8.
4. **Una lente a la vez.** Estructura, Riesgo, Cambios, Migración. Nunca dos métricas compitiendo
   por el color.
5. **Los hallazgos, en una franja fija.** El PR asoma en la interfaz, no en un panel escondido.
6. **Carriles de capas después.** Segunda vista para el comentario del PR (M2). El treemap explora;
   los carriles deciden.

## Consecuencias

- Perdemos la tercera dimensión de la ciudad 3D; se compensa con lentes, deltas e inspección.
- El layout debe ser determinista: mismo snapshot, mismos rectángulos.
- El renderer 2D puede empezar sin el motor de análisis completo: acepta un `cc.json`.

## Alternativas descartadas

- **Force-directed como vista principal.** No determinista, ilegible a escala y no comparable.
- **Riesgo como única métrica sin explicar.** Se descarta la caja negra: el compuesto se documenta y
  la complejidad cruda queda disponible.
- **Ambas vistas desde el inicio.** Duplica superficie antes de validar la primera.
