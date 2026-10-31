---
title: "Las lentes, contrastadas"
date: "2026-10-31"
category: "refactor"
verdict: "arreglo"
---

**Qué era**: cada lente tenía sus tests, pero nadie comprobaba que el snapshot dijera lo mismo por dos
caminos. `fanOut` podía contar una cosa y las aristas del mismo documento otra; el resumen de símbolos
podía no sumar sus nodos; el checksum podía depender de con qué se analizó. La sospecha era razonable y
la única forma de resolverla era medir el propio repo y cruzar las cifras.

**Qué cambia**: un auditor temporal —fuera del árbol analizado y sin commitear— recorre los invariantes
de todas las lentes sobre este repo: atributos solo de nodos existentes, descriptor para cada métrica,
`dependencyLevel` igual en la métrica y en la lente, `fanIn`/`fanOut` igual a la suma de las aristas,
símbolos y su resumen, estructura solo de ficheros, deuda, lenguajes y estados de migración, sumas y
copias de duplicación, y la ida y vuelta de `cc.json`.

Tres cosas salieron de ahí:

| Hallazgo | Qué se hizo |
|---|---|
| `fanIn`/`fanOut` contaban **vecinos únicos** y las aristas suman **imports**: un fichero con dos `import` al mismo módulo decía 9 donde la lente decía 10 | Suman el peso de la arista; el test del grafo fija que dos imports al mismo destino pesan dos |
| El checksum cambia con `git` y sin `git`, porque la lente de historial entra en él | **Abierto**: el navegador no tiene git, así que su checksum no casa con el del CLI. Pide decisión de modelo, no un parche |
| Las métricas de carpeta no viajan en `attributes`; se agregan al leer | Verificado: la UI ya lo hace así; no es una lente rota |

También se quitaron los bloques copiados que la primera medida encontró: las entradas de `schema` y
`lint` comparten ahora una superficie (`shared.ts`), el `reader.ts` de la web usa `DEFAULT_EXTENSIONS`
del parser en vez de su copia, los cuatro iconos del `InspectorBar` comparten un marco SVG, el catálogo
de perfiles se proyecta una sola vez en `@codarch/metrics` y `history` y `scopes` comparten el bucle de
argumentos.

**Por qué así**: auditar no es leer el código, es comprobar que dos lecturas del mismo dato coinciden.
El auditor vive fuera del repo a propósito: no es producto ni se instala, y su única salida son las
cifras. Lo que falla se arregla en la lente que miente —el grafo— y lo que pide una decisión de modelo
se deja escrito en vez de maquillado.

**Verificado**: suite entera en verde (**174 ficheros y 1509 tests**), typecheck y lint limpios y el
sitio se escribe. El auditor queda en verde en todo menos el checksum con y sin git, que es el hallazgo
abierto. Con la duplicación quitada, este repo mide **626 ficheros**, **1.820 líneas duplicadas** y
**466 repetidas** —el 3 % del `rloc`— en **1 par**: los dos `main.tsx`, que solo difieren en un
comentario. Los analizadores de Go, Java y Python
siguen compartiendo esqueleto por debajo del umbral de par: es la siguiente lente que hay que mejorar,
no una copia literal.

**Veredicto**: arreglo, con una decisión de modelo pendiente sobre el checksum entre entornos.
