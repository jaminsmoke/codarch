---
title: ADR 0005 — 2D primero, 3D como lente
description: "La ciudad 3D es la firma visual de CodeCharta. También es su coste: navegación difícil, oclusión, y una captura de pantalla que no cabe en la revisión de un PR."
section: desarrollo
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: 2D primero, 3D como lente
  order: 5
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

La ciudad 3D es la firma visual de CodeCharta. También es su coste: navegación difícil, oclusión,
y una captura de pantalla que no cabe en la revisión de un PR.

## Decisión

La v1 renderiza en **2D**: treemap para la jerarquía y el peso, grafo para las dependencias.

La vista 3D se implementa más adelante como **lente** sobre el mismo modelo de datos. No comparte
código con el treemap más allá del layout y las codificaciones.

## Consecuencias

- El criterio de legibilidad es exigente: el mapa debe entenderse en una captura estática.
- El modelo debe servir a ambos renders; si una decisión de datos solo funciona en 3D, está mal.
- La 3D no bloquea nada y llega cuando el producto ya es útil.
- Riesgo de que la 3D nunca llegue. Se acepta: es una lente, no la propuesta de valor.

## Alternativas descartadas

- **3D desde el inicio.** Mucho trabajo antes de validar el modelo.
- **Ambas a la vez.** Doble superficie de mantenimiento sin doble valor.

## Hoja de ruta

Sin fases abiertas: M0 está cerrada.
