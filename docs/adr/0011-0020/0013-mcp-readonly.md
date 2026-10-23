---
title: ADR 0013 — Servidor MCP de solo lectura
description: "El snapshot y el reporte ya contienen los hechos que necesita un agente: ficheros, métricas, dependencias, ciclos, cambios y violaciones. La cuña del producto incluye…"
section: adr
status: aceptado ✅
date: "2026-10-20"
sidebar:
  label: Servidor MCP de solo lectura
  order: 13
---

**Estado:** aceptado ✅ · **Fecha:** 2026-10-20

## Contexto

El snapshot y el reporte ya contienen los hechos que necesita un agente: ficheros, métricas,
dependencias, ciclos, cambios y violaciones. La cuña del producto incluye que ese modelo se pueda
consultar desde la conversación, no solo desde el CLI o el comentario de un PR.

MCP (Model Context Protocol) permite exponer herramientas a agentes sin construir una interfaz
propia. La tentación es que el servidor analice el repositorio en cada llamada, o que devuelva texto
redactado. Ninguna de las dos cosas encaja con un producto determinista y verificable.

## Decisión

1. **Servidor MCP local por stdio, de solo lectura.** Vive en `apps/mcp` y consume un snapshot
   `cc.json` ya generado y, opcionalmente, un `report.json`. No analiza código, no ejecuta reglas, no
   escribe snapshots y no modifica el repositorio.
2. **Cinco herramientas, datos estructurados.** `get_architecture_map`, `find_hotspots`,
   `check_change_impact`, `list_violations` y `explain_module` devuelven JSON observado a partir del
   snapshot/reporte. No hay prosa generada por el servidor. Los errores de uso se devuelven como
   resultado de herramienta con `isError` y un mensaje accionable.
3. **Datos ausentes explícitos.** Si no hay reporte, las consultas de cambios y violaciones devuelven
   `available: false` y un `reason`; no se inventan deltas, violaciones ni estados. Si una métrica no
   existe, `find_hotspots` falla y enumera métricas disponibles.
4. **Rutas relativas e ids.** Las herramientas aceptan rutas relativas al proyecto o ids de nodo;
   también aceptan el nombre de la raíz como prefijo. Se rechazan rutas absolutas, `..` y separadores
   que intenten salir del proyecto. La respuesta usa siempre rutas canónicas relativas.
5. **Riesgo compartido, ciclos verificados.** El riesgo se calcula con `riskScores` de
   `packages/metrics`, la misma fórmula que usa el render. Los ciclos se recalculan con SCC sobre las
   aristas del snapshot; no se confía en métricas opcionales `inCycle`/`cycleSize` de un `cc.json`
   externo.
6. **Agregación de carpetas explícita.** El tamaño de una carpeta es la suma de sus ficheros; la
   complejidad es el máximo `maxComplexity`; el riesgo es el máximo de sus ficheros. Los hijos de un
   nivel son solo los directos. `get_architecture_map` limita profundidad, hijos por carpeta y
   ficheros incluidos.
7. **stdout reservado al protocolo.** Los logs de arranque y los errores van a stderr. El lanzador
   `apps/mcp/bin/codarch-mcp.mjs` arranca el servidor TypeScript con el loader de `tsx` resuelto
   desde el propio repo, para que la configuración del cliente MCP no dependa de `npm run` ni de su
   salida.
8. **Rutas por defecto, override explícito.** El snapshot por defecto es `.codarch/snapshot.cc.json`;
   el reporte, `.codarch/report.json` si existe. `--root`, `--snapshot`, `--report` y `--no-report`
   permiten apuntar a los artefactos de un PR o de otra ejecución.
9. **Sin autenticación ni red.** El servidor no abre puertos ni llama a GitHub. La integración con un
   PR concreto consiste en cargar el snapshot/reporte que la acción ya publicó como artefacto o que
   el usuario generó localmente.

## Consecuencias

- Un agente puede responder “¿qué se rompe si cambio este fichero?” con datos del mismo reporte que
  ve el revisor, sin volver a analizar el repo.
- El servidor es barato: carga e indexa una vez y responde en memoria. El coste real sigue estando
  en `analyze` y `diff`.
- La calidad de las respuestas depende de que el snapshot/reporte esté actualizado. El servidor no
  finge frescura: devuelve checksum, commit y `reportLoaded`.
- El arranque requiere Node 22, el checkout de CodArch y sus dependencias (`tsx`, MCP SDK). Publicar
  un paquete npm o un binario queda para la fase de distribución.
- No hay herramientas de escritura. Un agente no puede cambiar reglas ni snapshots desde MCP; eso
  mantiene la superficie de confianza pequeña.
- El servidor es local y mono-usuario. No hay sesión, cuotas ni autorización; no es un servicio
  remoto.

## Alternativas descartadas

- **Analizar dentro de MCP.** Duplicaría el pipeline, añadiría latencia y haría que dos llamadas
  pudieran observar estados distintos. El análisis debe ser un artefacto, no un efecto lateral de una
  consulta.
- **Devolver solo el `cc.json` crudo.** Es demasiado grande y obliga al agente a reconstruir
  agregaciones, riesgo y ciclos. Las herramientas existen para responder preguntas concretas.
- **Redactar resúmenes en el servidor.** Un texto “bonito” puede ocultar datos ausentes o mezclar
  métricas. El agente puede redactar; el servidor debe entregar hechos.
- **Herramientas de escritura o de ejecución de análisis.** Aumentan el riesgo y no son necesarias
  para la cuña de revisión y consulta.
- **Servidor HTTP/SSE remoto desde el principio.** Añade autenticación, despliegue y multi-tenant
  antes de validar el uso local. stdio es el transporte natural para un checkout y un agente local.
- **Confiar en `inCycle`/`cycleSize` del snapshot.** Un `cc.json` de terceros puede no traerlos o
  traerlos incoherentes; el SCC sobre aristas es la fuente verificable.

## Hoja de ruta

Sin fases abiertas; esta decisión se aplica en M3.
