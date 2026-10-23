---
title: La cadena de un símbolo se busca por su vida
date: "2026-10-23"
category: fix
verdict: arreglo
---

**Qué era**: `get_symbol_chain` decía que devolvía el calor del repo, pero sin `symbol` respondía
con un error y el calor vacío. La búsqueda recorría ficheros, carpetas y proyecto, solo miraba el
nombre actual y el esquema prometía un `limit` de 50 que el payload cortaba en 20. Además, todas
las cadenas de símbolo se guardaban como `function`, aunque fueran clases o interfaces.

**Decisión**: [ADR 0039](../../adr/0031-0040/0039-la-busqueda-de-una-cadena.md). Sin símbolo se
devuelve el calor; con símbolo se buscan solo cadenas de símbolo por el nombre o la ruta actuales
o por los de cualquier versión, se respeta el límite y se conserva el tipo real. El snapshot y el
checksum no cambian; el libro mayor se rehace.

**Veredicto**: **arreglo**, con ADR 0039; hecho.
