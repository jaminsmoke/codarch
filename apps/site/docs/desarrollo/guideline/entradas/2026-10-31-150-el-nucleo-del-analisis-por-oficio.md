---
title: "El núcleo del análisis, por oficio"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: `packages/parsers/src/analyze-core.ts` tenía 1059 líneas y cinco oficios: el contrato de la
pasada (opciones, resultado y progreso), el estado que se llena mientras se recorre, el recorrido que mide
cada fichero y su caché de parseo, la resolución de imports —cuatro familias, una por lenguaje— y la
resolución diferida de los `using` de C#, más las tres pasadas que aplican historial, grafo y migración. Todo
con el mismo `export` a la vista y funciones `function` privadas que se llamaban entre sí a lo largo de mil
líneas.

**Qué cambia**: el fichero queda en 203 líneas y ordena fases; cada oficio vive en `analyze/`:

| Módulo | Qué es |
|---|---|
| `analyze/types.ts` | lo que entra y lo que sale: opciones, resultado, progreso, avisos |
| `analyze/state.ts` | el estado de la pasada y su constructor vacío |
| `analyze/measure.ts` | leer, parsear y apuntar cada fichero, con la caché (ADR 0056) |
| `analyze/links.ts` | de un import a arista, cruce FFI, dependencia o roto (ADR 0090) |
| `analyze/namespaces.ts` | los `using` de C#, que se cierran al final |
| `analyze/apply.ts` | historial, grafo y migración sobre las métricas ya medidas |

La dependencia va en un sentido: `analyze-core` cablea; `measure` usa `links` y `namespaces`; nadie mira
hacia arriba.

**Por qué así**: `analyze-core.ts` es el corazón del producto —el que decide el checksum— y estaba escrito
como una sola función con ramas por lenguaje. Separar no cambia una línea de la lógica: los comentarios que
explican cada regla viajan con su función, y el orquestador se lee como la lista de fases que es. La regla de
los `using` gana además pruebas propias, porque es la pieza que se resuelve tarde y la que más fácil se rompe
en silencio: sus ocho casos fijan las tres preguntas (¿lo declara alguien? ¿la raíz es del repo? ¿es
plataforma?) sin montar un proyecto C# entero.

**Verificado**: la suite entera en verde —**173 ficheros y 1497 tests**, eran 1489—, con los de determinismo
de siempre (`tree.test.ts` compara fichero a fichero contra el propio repositorio) y los de C#, Go, Java y
Python de punta a punta. Typecheck y lint limpios, y el bundle del navegador se escribe igual.

**Veredicto**: arreglo.
