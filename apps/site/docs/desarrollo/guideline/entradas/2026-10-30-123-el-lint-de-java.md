---
title: "El lint de Java"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**Qué era**: Checkstyle se detectaba por su XML o por el plugin de Gradle, entraba en el artefacto con un «aún no tiene lector» y no medía nada: Java era el único lenguaje soportado sin lint en el mapa.

**Qué cambia**: se lanza `checkstyle -c <config> -f xml .` con el `checkstyle` del PATH y se lee su XML, que trae fichero, línea, columna, severidad y la clase que produce el hallazgo. La regla se queda con el nombre de la clase sin el `Check` —`EmptyStatementCheck` es `EmptyStatement`, como lo declara la config— y `ignore` no entra. Sus reglas activas salen de los `<module name="…">` del XML, sin contenedores (`Checker`, `TreeWalker`) ni filtros de supresión, que no miden nada; la severidad no se lee del módulo, porque su config no la pone ahí, y se dice. Si lo que hay es el plugin de Gradle y no se sabe qué XML usa, no se inventa la ruta: el sistema se declara y no se mide.

**Por qué así**: el XML es la salida que su CLI da desde siempre; el SARIF depende de la versión. Y el XML no se interpreta a mano más allá de sus atributos: no hay reglas ni severidades que sacar de otro sitio.

**Verificado**: tests del lector con ficheros, entidades, severidades y el `ignore` fuera; de los módulos con contenedores y filtros; de la detección con XML y con el plugin de Gradle, y del despacho en `runLint`. Además, una pasada real de `codarch lint` en un repo de prueba con un binario simulado: tres módulos activos y dos hallazgos —uno de error y uno de aviso— con línea y columna en `lint.cc.json`. Suite completa (1.267), lint, typecheck y build del sitio en verde.

**Lo que falta**: los lectores de `go vet` y de los analizadores de .NET, los dos últimos sistemas sin medida.

**Veredicto**: fase en marcha.
