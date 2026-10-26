---
title: Las entradas se despliegan
date: "2026-10-24"
category: fix
verdict: arreglo
---

**Qué era**: cada entrada mostraba su cuerpo entero de golpe. Un día con 8 entradas era una pared de
texto y la línea del tiempo perdía su efecto al recargarse la página al cambiar de día.

**Qué se hizo**: cada entrada es un desplegable; por defecto solo se ve el título y el veredicto
en una fila compacta. Al pulsar se despliega el cuerpo con animación (`AnimatePresence` +
`motion`); el chevron rota 180°. La línea del tiempo anima la pastilla activa con `layoutId`
(spring) entre días y la transición entre días usa `AnimatePresence` (exit + enter) sin cortar la
animación de la cabecera.

**Veredicto**: **arreglo**, sin ADR (es UI, no modelo). No cambia el checksum ni las rutas.
