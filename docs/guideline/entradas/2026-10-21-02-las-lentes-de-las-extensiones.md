---
title: Las lentes de las extensiones
date: "2026-10-21"
category: feature
verdict: esperar
---

**Qué es**: que una extensión pueda **medir algo nuevo** y meterlo en el snapshot (por ejemplo,
las dependencias de NestJS o los módulos de un framework).

**Por qué**: es lo que haría las extensiones **verdaderamente útiles**: no solo vistas, sino
señales nuevas.

**El problema**: el **checksum**. Si una lente depende de la extensión, el snapshot depende de
lo instalado → el mismo código daría checksums distintos → el análisis dejaría de ser
reproducible (que es la propiedad que el producto protege con más cuidado).

**La decisión**: [ADR 0029](../../adr/0021-0030/0029-los-addons.md): hoy **no**. Un addon no añade
lentes («A»), y la puerta queda abierta a «B» —el productor **dentro** del snapshot → «el
mismo código + los mismos addons = el mismo checksum» — cuando la manera esté decidida, con su
propio ADR.

Mientras tanto, un addon que necesite una señal nueva la **calcula en su vista** (como hace el 3D)
y no la comparte: no puede pintarla, ni verla en el PR, ni preguntársela al agente.

**Veredicto**: **esperar** la variante «B»: la manera tiene que estar decidida antes de
ofrecerla.

**Tamaño**: grande. Y el primero en necesitarlo quizá sea el 3D (que ahora no toca el modelo).
