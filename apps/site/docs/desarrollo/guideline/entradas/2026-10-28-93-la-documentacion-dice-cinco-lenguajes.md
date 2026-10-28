---
title: La documentación dice los cinco lenguajes, y M61 se cierra
date: "2026-10-28"
category: docs
verdict: fase
---

**Qué era**: el análisis ya entendía TS/JS, Java, Python, Go y C#, pero la documentación seguía prometiendo un producto de TypeScript/JavaScript. El `AGENTS.md` declaraba la v1 así, los READMEs decían «analiza un repositorio TypeScript/JavaScript», la ayuda de `analyze` dibujaba solo Java y Python, y la página de `codarch analyze` no decía qué lenguajes lee: quien llegaba con un repo Go tenía que adivinarlo.

**Qué es**: las páginas de uso nombran los cinco lenguajes y, sobre todo, dicen **a qué apunta un import en cada uno**, que es donde el mapa se gana o se pierde. `codarch analyze` gana una sección «Qué analiza» con la tabla de extensiones y la resolución de cada lenguaje —módulos y alias en TS/JS, el fichero `a/b/C.java` por sufijo en Java, el módulo o el paquete con `__init__.py` en Python, el paquete entero con el prefijo del `go.mod` en Go, y los ficheros que declaran el `namespace` en C#—, más la aclaración de que Rust, `.wasm` y `.node` solo se miden para la lente de migración. La FAQ gana la pregunta «¿Qué lenguajes entiende?», que es la que se hace quien prueba la herramienta con su repositorio, y primeros pasos lo dice en el primer análisis. El `model.md` enseña el pipeline real —el parser se elige por extensión y la caché se firma con su nombre— en vez del `TypeScriptParser.parse` de la v1.

**Por qué así**: la lente de migración sigue siendo JS/TS → Rust, y la documentación lo dice en el mismo párrafo en que nombra los cinco lenguajes. Separar las dos cosas importa: un fichero Java es un nodo del mapa con métricas y aristas, pero no tiene estado, deuda ni cruces, y prometer lo contrario habría sido cambiar el significado de una lente que ya está publicada.

**Qué falta**: nada de M61.

**Veredicto**: M61 está **cerrada**. Los cinco lenguajes se analizan, se dibujan y se documentan; lo que queda abierto del producto son M23, M31, M34 y M49.
