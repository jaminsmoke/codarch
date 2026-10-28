---
title: Go entra en el mapa, y un import son varias aristas
date: "2026-10-28"
category: feature
verdict: fase
---

**Qué era**: el mapa miraba TS/JS y, desde esta semana, Java y Python. Un repositorio Go se veía casi vacío: sus ficheros no existían para el recorrido, no había aristas y no había complejidad.

**Qué es**: Go entra entero. Un `.go` es un nodo con `loc`, `rloc`, `functions`, `maxComplexity` y `maxFunctionLength`; con sus símbolos —funciones, métodos con receptor, un `struct` como clase, una `interface` como interfaz, cualquier otro tipo declarado como tipo, y las `const` y `var` del paquete, con el hash del valor para que renombrar no mueva la identidad—; con sus miembros, que son los campos del `struct`; y con sus `import` como aristas. Aquí hay una diferencia con los demás lenguajes y es la que da forma a todo: **Go importa paquetes, no ficheros**, así que un import deja de ser una arista y pasa a ser tantas como `.go` tenga la carpeta destino, ordenadas por ruta. Todo sale de un solo recorrido, y hay dos parsers —el nativo del CLI y el `.wasm` del navegador— con el mismo código: el checksum coincide.

**Por qué así**: el nombre del módulo no vive en cada fichero, sino en el `go.mod` de la raíz, así que se lee una vez por análisis, antes de medir nada, y no una vez por import. Con ese prefijo, un import que empieza por él es una carpeta del repositorio, y si la carpeta no existe el import está **roto** —Go lo rechazaría— y se cuenta con su línea. Un import que no empieza por el módulo es de fuera: la biblioteca estándar no lleva punto en su primer segmento (`fmt`, `net/http`), así que se cuenta como builtin, y lo demás son dependencias. Sin `go.mod` legible se prueba el sufijo del import, de más específico a menos, que es lo que vale para un proyecto plano; a cambio, un import de fuera puede casar con una carpeta del repo que se llame igual. En la complejidad cuentan `if`, `for`, cada `case` —también en un `type switch` y en un `select`—, `&&` y `||`; `default` no, porque no abre camino, y un `else if` es un `if` anidado y cuenta por su cuenta. Un campo incrustado no declara nombre y no es miembro; `_` y `.` no son alias y no entran como nombre.

**Qué falta**: C#, y la documentación de uso, que sigue prometiendo TS/JS.

**Veredicto**: Go está hecho dentro de **M61**. El checksum de un repositorio de TS/JS sigue sin moverse, y el de un repositorio Go es el mismo en el CLI y en el navegador.
