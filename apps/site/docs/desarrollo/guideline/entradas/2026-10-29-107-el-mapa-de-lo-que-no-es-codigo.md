---
title: "El mapa de lo que no es código"
date: "2026-10-29"
category: "feature"
verdict: "adr"
---

**Qué era**: el mapa cuenta el código y solo el código. El recorrido acepta doce extensiones, así que los documentos, la configuración y los assets no existen en el modelo: ni en el árbol, ni en las métricas, ni en el checksum. En este repositorio eso deja fuera 443 documentos y 29 configuraciones, la mitad del proyecto.

**Qué cambia**: el [ADR 0093](../../adr/0091-0100/0093-el-mapa-de-lo-que-no-es-codigo.md) abre la fase **M64** con un segundo snapshot, `.codarch/rest.cc.json`, escrito por la misma pasada de `analyze`: cc.json 2.x con su propio checksum, el área en bytes y una lente `rest` con el tipo de cada fichero. El escenario gana la pestaña `El resto` y el snapshot del código no cambia ni de contenido ni de checksum.

**Por qué así**: el corte tenía que ser del artefacto y no del pintado. Una lente dentro del snapshot del código habría metido los documentos en el diff del PR, en las reglas de capas y en el checksum, que hoy significa «este código»; filtrarlos al dibujar no deshace nada de eso. Y todo lo que el recorrido encuentre entra con un tipo —`doc`, `config`, `asset` u `other`—: lo que no casa con ninguna regla se queda en `other` en vez de desaparecer, que es lo que hacía que el mapa mintiera por omisión.

**Lo que falta**: todo M64. El recorrido repartido en una pasada, el snapshot con su test de determinismo, `analyze` y `serve` escribiendo el segundo archivo, la pestaña y sus bloques en el raíl, la ficha del fichero que no es código y, en su ADR, las reglas del resto: enlaces rotos, huérfanos, frontmatter y la gemela de idioma declarada en `.codarch.yml`.

**Veredicto**: la decisión, tomada.
