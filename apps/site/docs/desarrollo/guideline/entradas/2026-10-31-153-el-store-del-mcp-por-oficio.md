---
title: "El store del MCP, por oficio"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: `apps/mcp/src/store.ts` tenía **869 líneas**, 55 funciones y nueve oficios: el contrato —los
tipos de la consulta y `McpDataError`—, las claves de métrica y el riesgo compuesto, los ficheros del
snapshot, las carpetas con sus totales, las aristas y sus dos índices, los ciclos por componente
fuertemente conexa —Kosaraju iterativo—, las rutas con su normalización y sus sugerencias, el reporte
indexado con sus consultas de cambio y la carga de disco con la precedencia de los dos reportes (ADR 0101).
Una sola clase lo hacía todo, con veinticuatro campos privados y métodos que se llamaban entre sí a lo
largo del fichero. Era el **primero del repo por deuda**: 336.

**Qué cambia**: `store.ts` se queda en **212 líneas** con la clase y el cableado; cada oficio vive en su
módulo hermano, con el prefijo del store para que se vea de qué son:

| Módulo | Qué es |
|---|---|
| `store-types.ts` | el contrato: error, fichero, carpeta, arista, violación, estado del reporte, opciones y resumen |
| `store-shared.ts` | el orden estable, la lectura de números y los prefijos de ruta que comparten todos |
| `store-files.ts` | las claves de métrica del snapshot, los ficheros con su riesgo y el puesto por riesgo |
| `store-folders.ts` | las carpetas con sus totales, su máximo y sus hijos |
| `store-edges.ts` | las aristas sin repetir por par y los índices de entrada y salida |
| `store-cycles.ts` | los ciclos de ejecución y Kosaraju con su pila explícita (ADR 0037) |
| `store-paths.ts` | normalizar una ruta, resolver fichero o carpeta y sugerir cuando no hay |
| `store-report.ts` | el reporte indexado y las consultas: estado, cifras, hotspots y violaciones |
| `store-load.ts` | leer el snapshot y un reporte explícito, con el error que dice qué falta |

La dependencia va en un sentido: `store.ts` cablea las fases; los demás leen `store-types` y
`store-shared`, y nadie mira hacia arriba. `store.ts` sigue reexportando el contrato y
`loadArchitectureStore`, así que `index.ts`, `server.ts`, las doce consultas de `tools/` y los fixtures no
cambian una línea.

**Por qué así**: el store es la puerta de solo lectura que el MCP abre a un snapshot y un reporte; todo lo
que un agente pregunta pasa por él, y estaba escrito como una clase con nueve trabajos y estado mutable
repartido en mapas privados. Separar no cambia la lógica: los comentarios que explican cada regla viajan
con su función —la arista de tipos que no cierra ciclo, el self-loop, la precedencia del reporte HEAD—, y
cada pieza se puede leer sin tener delante las otras ocho. La clase se queda con lo que de verdad es suyo:
los índices, la superficie pública y las cuatro decisiones de carga.

**Verificado**: la suite entera en verde —**173 ficheros y 1497 tests**, los 52 del MCP entre ellos—, con
`store.test.ts` fijando la carga por defecto, la precedencia del reporte HEAD, las dos raíces y los ciclos
solo de tipos, y `mcp.test.ts` recorriendo las doce consultas. Typecheck y lint limpios. La deuda del
fichero baja de **336 a 256** y deja de estar el primero del repo; su peor `maxComplexity` baja de 20 a 15.
No hay pruebas nuevas porque no hay comportamiento nuevo: el reparto mueve código, no reglas.

**Veredicto**: arreglo.
