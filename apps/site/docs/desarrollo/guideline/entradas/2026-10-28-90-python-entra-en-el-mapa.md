---
title: Python entra en el mapa, con `__init__.py` y sin leer el manifiesto
date: "2026-10-28"
category: feature
verdict: fase
---

**Qué era**: el mapa miraba TS/JS y, desde ayer, Java. Un repositorio Python se veía casi vacío: sus ficheros no existían para el recorrido, no había aristas y no había complejidad.

**Qué es**: Python entra entero. Un `.py` es un nodo con `loc`, `rloc`, `functions`, `maxComplexity` y `maxFunctionLength`; con sus símbolos —clase y función, más las constantes del módulo, que en Python son lo más parecido a una superficie pública—, cada función con su complejidad y el mismo hash de cuerpo que TS y Java, así que un renombrado no rompe la identidad; con sus miembros, que son las asignaciones del cuerpo de la clase y los `self.x = …` de sus métodos, sin repetir el campo que se declara en dos sitios; y con sus `import` como aristas del grafo. Todo sale de un solo recorrido del árbol, y hay dos parsers —el nativo del CLI y el `.wasm` del navegador— con el mismo código de medición: el checksum coincide. El navegador ya lee los `.py` de la carpeta y carga la gramática.

**Por qué así**: la resolución no lee `requirements.txt` ni `pyproject.toml`. Un módulo es un `.py` y un paquete es una carpeta, así que un import es una ruta que se busca por sufijo: vale igual la raíz del repositorio que un `src/` dentro del `sys.path`. `import a.b` busca `a/b.py` y `a/b/__init__.py`; `from a.b import C` lleva sus nombres, que pueden ser submódulos o nombres del módulo, y por eso prueba primero `a/b/C.py` y después `a/b.py` o su `__init__.py`. Un import relativo cuelga del paquete del fichero y cada punto sube un nivel: `from . import x` es un hermano de `x`, `from ..pkg import y` es un paquete tío. Lo que no es arista se cuenta con su nombre: la biblioteca estándar (`os`, `json`, `typing`…) es builtin, `from x import *` apunta a un paquete entero y es externo sin arista, lo que no está ni en el repositorio ni en la biblioteca es una dependencia, y un import relativo cuyo paquete está en el repo pero cuyo módulo no aparece es un import roto, que se cuenta con su línea. El comentario se reconoce por tipo de nodo y no por su texto —un `#` dentro de un string no es un comentario—, así que `rloc` no cuenta comentarios y el hash del cuerpo los ignora. En la complejidad cuentan `if` y `elif`, `for`, `while`, `except`, el `case` de un `match`, el ternario, `and` y `or`, y el filtro de una comprensión; `else` y `finally` no, porque no abren camino.

**Qué falta**: Go y C#, y la documentación de uso, que sigue prometiendo TS/JS.

**Veredicto**: Python está hecho dentro de **M61**. El checksum de un repositorio de TS/JS sigue sin moverse, y el de un repositorio Python es el mismo en el CLI y en el navegador.
