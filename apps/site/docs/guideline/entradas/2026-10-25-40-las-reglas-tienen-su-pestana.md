---
title: Las reglas tienen su pestaña
date: "2026-10-25"
category: feature
verdict: adr
---

**Qué era**: las reglas vivían al final de la pestaña PR, después de la migración, los símbolos y los
ficheros. Solo se veían cinco violaciones nuevas; las existentes y las resueltas se contaban pero no
se podían abrir. Los hotspots, mientras tanto, repetían una lista que el resumen ya numeraba.

**Qué cambió**: una cuarta pestaña, **Reglas**, entre Lentes y PR. Enseña el resumen de la
arquitectura del cambio —nuevas, existentes, resueltas, errores y avisos nuevos, reglas y capas
evaluadas, perfil aplicado—, las tres listas completas con la regla, su origen (`equipo`, `perfil` o
addon), la severidad, el mensaje y el detalle de la arista, la métrica o el ciclo, y un recuento por
origen. Los hotspots se mudan aquí con su métrica y su antes y después. Un punto rojo avisa de las
violaciones nuevas sin abrir la pestaña.

**Números**: PR se queda con lo que es, el cambio: ficheros, aristas, ciclos, migración y símbolos.
`tab=rules` viaja en la URL y en las vistas guardadas. No hay análisis nuevo ni cambia `cc.json`:
todo sale del `report.json` que ya existía.

**Veredicto**: [ADR 0058](../../adr/0051-0060/0058-las-reglas-tienen-su-pestana.md), hecho. Quedan en
su hoja de ruta convertir Lentes en una subsección de Reglas, filtrar por severidad u origen y
enseñar las reglas configuradas que no se violan.
