---
title: El parser se elige por extensión y la caché firma cada entrada
date: "2026-10-28"
category: refactor
verdict: fase
---

**Qué era**: el análisis pedía **un** parser y se lo aplicaba a todo lo que `languageForPath` reconocía, y la caché guardaba de cada fichero su `tamaño:mtime` con un parser supuesto: el mismo para todos. En `parse-cache.json` el nombre del parser iba en la cabecera, como si un alcance no pudiera tener más de una gramática.

**Qué es**: el análisis recibe una **lista** y elige por extensión, con el orden de la lista como desempate explícito; el recorrido cubre la unión de las extensiones de los parsers y las que mide la lente de migración. La caché firma **cada entrada** con el parser que la produjo y un acierto exige que coincidan el parser y la versión. El formato sube a 2, así que las cachés que había se ignoran y se reparsean una vez.

**Por qué así**: con más de un lenguaje, la versión del fichero ya no dice con qué se midió —dos gramáticas pueden haber visto el mismo `tamaño:mtime`—, y una entrada de un lenguaje que acierta en otro daría nodos con métricas que no son suyas. Firmar la entrada deja que la caché siga viajando entre alcances sin contagios. El puente y la deuda de la migración se miden solo cuando el lenguaje es de la lente, así que un fichero de otro lenguaje es un nodo sin estado de migración, que es lo que decide el [ADR 0090](../../adr/0081-0090/0090-mas-lenguajes-que-ts-y-js.md).

**Qué falta**: los cuatro lenguajes del [ADR 0090](../../adr/0081-0090/0090-mas-lenguajes-que-ts-y-js.md) con su resolución de imports. Java es el primero.

**Veredicto**: el primer paso de **M61** está hecho. El checksum de un repositorio de TS/JS no se mueve, y lo vigila un test.
