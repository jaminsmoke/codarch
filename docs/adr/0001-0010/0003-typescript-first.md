# ADR 0003 — TypeScript primero, Rust cuando un benchmark lo exija

**Estado:** aceptado · **Fecha:** 2026-10-20

## Contexto

Rust ofrece rendimiento y un único motor nativo + WASM para CLI, CI y navegador. Es la arquitectura
"definitiva". También es la forma más común de no llegar nunca al producto.

El parsing real lo hace tree-sitter, que ya es C. Lo que queda en JS es orquestación, resolución de
imports y algoritmos de grafo: mucho menos crítico de lo que parece.

Además, este proyecto tiene un caso de uso propio: **usar la herramienta para planificar y
visualizar su propia migración a Rust**. Eso exige que el núcleo sea modular y que el límite entre
ambos lenguajes sea visible.

## Decisión

Núcleo en **TypeScript**, con arquitectura preparada para extraer piezas a Rust:

1. **Puertos explícitos.** El núcleo expone interfaces (`FileSystem`, `Parser`, `Clock`). Nada de
   `fs` ni `process` dentro de `model` y `metrics`.
2. **Funciones puras y deterministas.** Sin estado global, sin fechas implícitas, sin orden de
   iteración dependiente del sistema de ficheros.
3. **Frontera medible.** El pipeline se instrumenta por etapa desde el primer día, para saber qué
   mover si hace falta.

**Disparadores de extracción a Rust** (cualquiera de ellos abre un ADR nuevo):

- p95 de análisis en 10k ficheros > 5 s.
- Pico de memoria > 1 GB en 10k ficheros.
- El job de CI supera los 3 minutos solo en análisis.

## Consecuencias

- Iteración rápida y distribución trivial vía npm y GitHub Action.
- El riesgo de rendimiento se gestiona con datos, no con fechas.
- La migración a Rust será incremental y verificable con la propia herramienta: misma salida,
  distinta implementación.
- Si el benchmark nunca se incumple, Rust no llega. Eso es un éxito, no un fracaso.

## Alternativas descartadas

- **Rust desde el inicio.** Construcción más lenta, dos targets (napi + wasm), y optimización antes
  de tener producto.
- **Kotlin/JVM.** Como CodeCharta. Rápido en repos grandes, pero arrastra la JVM al CI y no corre
  en el navegador.
