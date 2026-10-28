---
title: Java, Python, Go y C# entran al mapa
date: "2026-10-28"
category: feature
verdict: adr
---

**Qué era**: la v1 se declaró TypeScript/JavaScript y se cumplió al pie de la letra. El recorrido solo busca esas extensiones, el análisis pide un parser y `languageForPath` descarta lo que no es lenguaje de la lente de migración. Un repositorio Java, Python, Go o C# se veía casi vacío: sin nodos, sin aristas y sin complejidad, que es justo lo que el mapa tiene que enseñar. Rust era la excepción a medias —LOC/RLOC a mano, sin árbol— y el resto no existía.

**Qué es**: el [ADR 0090](../../adr/0081-0090/0090-mas-lenguajes-que-ts-y-js.md) decide que **Java, Python, Go y C#** entren con el análisis entero: métricas del fichero, símbolos con su complejidad, miembros de clase donde el lenguaje los tenga e imports resueltos como aristas. La decisión importante es lo que **no** cambia: `cc.json` sigue igual, sin un campo `language` nuevo, porque un fichero de estos lenguajes es un nodo como los demás y el lenguaje se deriva de la extensión. La lente de migración tampoco se toca: sigue contando la migración de JS/TS a Rust, y un `.java` no tiene estado de migración porque no participa en ella.

**Por qué así**: el análisis pasa a recibir una lista de parsers y elige por extensión, y la caché firma **cada entrada** con el parser que la produjo, para que una gramática no se coma el parseo de otra. La resolución no lee `pom.xml`, `build.gradle` ni `go.mod` para deducir raíces: buscar el sufijo `a/b/C.java` resuelve igual Maven, Gradle y un proyecto plano, y en Go el `go.mod` solo hace falta para el prefijo del módulo. Los comodines y los alias no crean aristas, y lo que no resuelve se cuenta con su línea, como hoy. El invariante que cierra la decisión es el otro lado: un repositorio solo de TS/JS tiene que dar el mismo `cc.json` byte a byte.

**Qué falta**: la fase **M61**, con cinco pasos —el parser por extensión y la caché por entrada; Java; Python; Go; C#— y la documentación que hoy sigue prometiendo solo TS/JS. Los tests de cada lenguaje y el del checksum intacto son la puerta de cada paso.

**Veredicto**: ADR 0090, dentro de M61. La decisión está tomada; el código empieza por Java, que es lo que la trae.
