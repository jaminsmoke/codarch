---
title: ADR 0009 — Churn desde git, sin romper el determinismo
description: "La lente de riesgo de M0 usa 0,5·complejidad + 0,32·churn + 0,18·tamaño. Hasta M1 no había churn: el render renormalizaba los pesos y el mapa seguía siendo útil, pero…"
section: adr
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: Churn desde git, sin romper el determinismo
  order: 9
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

La lente de riesgo de M0 usa `0,5·complejidad + 0,32·churn + 0,18·tamaño`. Hasta M1 no había
churn: el render renormalizaba los pesos y el mapa seguía siendo útil, pero perdía la señal de
cambio, que es la mitad de la cuña del producto (PR/CI).

Necesitamos historial por fichero sin convertir el snapshot en un artefacto dependiente de la hora
de ejecución, del locale o de la máquina.

## Decisión

1. **Un solo `git log` por análisis.** No se ejecuta `git log --follow` por fichero. Se lanza:
   ```
   git -c core.quotePath=false log --no-merges --numstat --format=__CODARCH__%H%x09%ae
   ```
   y se parsea una vez. Los commits merge se excluyen para no duplicar cambios.
2. **Métricas por fichero:** `number_of_commits` y `number_of_authors`. El autor se identifica por
   email. Los ficheros sin historial reciben `0`, no se omiten.
3. **Todo el historial por defecto.** Una ventana relativa (`--since "12 months ago"`) cambiaría el
   resultado con el paso del tiempo para el mismo commit. Si más adelante hace falta una ventana,
   será una fecha absoluta o un parámetro explícito.
4. **Sin seguir renames.** Un rename aparece como borrado + alta. Es una aproximación deliberada:
   seguir renames por fichero multiplica el coste y complica el determinismo.
5. **El snapshot solo guarda números derivados.** No guarda fechas, autores, mensajes ni rutas
   absolutas. El checksum sigue siendo canónico.
6. **Si no hay git, se omite la señal.** `codarch analyze` funciona en un directorio sin repo; el
   render renormaliza el riesgo. Un clon shallow produce un warning: los conteos pueden ser
   incompletos.
7. **Tests sin git.** Los fixtures de análisis pasan `git: false`; el churn se prueba en un repo
   temporal con commits reales.

## Consecuencias

- El mapa gana la señal de cambio sin una base de datos ni un servicio externo.
- El coste es lineal con el tamaño del historial. Un repo grande puede tardar más que el parser;
  se medirá y, si duele, se añadirá caché incremental.
- El análisis del working tree no incluye cambios sin commitear. Para CI se analiza un commit, que
  es exactamente el caso de uso.
- Un shallow clone no es equivalente a un clone completo. El warning evita una garantía falsa.

## Alternativas descartadas

- **`git log --follow` por fichero.** Preciso para renames, pero N procesos y mucho más lento.
- **Librería de git en JS.** Añade dependencia y superficie para algo que el binario de git ya hace.
- **Churn calculado en el render.** El render no debe ejecutar git ni depender del entorno.
- **Guardar el historial completo en el snapshot.** El snapshot es un mapa, no un archivo de git.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M2.
