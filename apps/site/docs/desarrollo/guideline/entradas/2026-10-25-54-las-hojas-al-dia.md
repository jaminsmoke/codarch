---
title: Las hojas de ruta, al día
date: "2026-10-25"
category: docs
verdict: arreglo
---

**Qué era**: dos hojas de ruta contaban menos de lo hecho, y se notó al revisar las cuatro fases abiertas
antes de elegir cuál atacar. La **M49** decía «sin empezar» con cinco casillas, y tres ya estaban cumplidas:
la M50 había llevado el pliegue a la ficha y a **Cambios**, la vida del símbolo ya era una sección con cuenta y
resumen, y el estado plegado se recordaba por sección desde `sections.ts`. La **M23** decía que faltaban «el
dominio propio y la búsqueda», y la búsqueda lleva desde el ADR 0046 con Pagefind sobre el sitio entero. El
índice de fases repetía el «sin empezar» de la M49, así que el error se leía en dos sitios.

**Qué cambió**: la M49 pasa a **en curso** y su lista dice lo que queda de verdad —los diez bloques del raíl,
que siguen con su encabezado suelto; un guard en `@codarch/ui` que exija título, cuenta y resumen; y una
decisión pendiente sobre la tabla de métricas de **Cambios**—. La M23 deja de pedir la búsqueda y pone el
dominio propio como único pendiente, con sus dos mitades: comprar y apuntar el DNS, y quitar el `base: /codarch`
del config de Astro, que cambia todas las rutas internas. La vista del reporte deja de ser una casilla suelta:
`tab=pr` se lee como `changes`, así que no hay una ficha aparte que arreglar.

**Por qué se anota aquí**: una hoja de ruta desactualizada no es un detalle de estilo. Hace que el siguiente
lea como pendiente lo que ya está y decida con datos falsos, que es justo lo que pasó al abrir estas cuatro.

**Veredicto**: arreglo, hecho. Las fases siguen abiertas en [su ADR](../../roadmap.md); lo que cambia es
que ahora dicen la verdad.
