---
title: C# entra en el mapa, y el espacio de nombres se resuelve al final
date: "2026-10-28"
category: feature
verdict: fase
---

**Qué era**: el mapa miraba TS/JS y, desde esta semana, Java, Python y Go. Un repositorio C# se veía casi vacío: sus ficheros no existían para el recorrido, no había aristas y no había complejidad.

**Qué es**: C# entra entero. Un `.cs` es un nodo con `loc`, `rloc`, `functions`, `maxComplexity` y `maxFunctionLength`; con sus símbolos —`class`, `struct` y `record` como clase, `interface` como interfaz, `enum` como enum, `delegate` como tipo, y los métodos y constructores como función con su complejidad—; con sus miembros, que son los campos, las propiedades y los parámetros de un `record`; y con sus `using` como aristas. Sale de un solo recorrido, y hay dos parsers —el nativo del CLI y el `.wasm` del navegador— con el mismo código: el checksum coincide.

**Por qué así**: C# no importa ficheros ni carpetas, importa **espacios de nombres**, y el espacio de un fichero no se deduce de su ruta como el paquete de Java: lo declara él mismo, con bloque o de fichero entero. Eso rompe la resolución de los demás lenguajes, que se cierra mientras se mide el fichero que escribe el import: aquí no se sabe quién declara `Acme.Billing` hasta haber medido el último fichero. Así que el `using` se apunta y se cierra al final, con el mapa de espacios declarados en la mano. Tres preguntas, en orden: si algún fichero declara el espacio, son aristas —una por fichero, porque `using Acme.Billing;` te da todo lo que hay en ese espacio, no un fichero concreto—; si el repositorio declara su raíz pero no el espacio (`using Acme.Gone` con `Acme.Billing` dentro), el import está roto y se cuenta con su línea; si no, `System…` y `Microsoft…` son plataforma y el resto dependencias. Un `using` del espacio que uno mismo declara no es una arista hacia sí mismo: es lo normal en C#, y contarlo como ciclo sería inventarse uno. Un alias (`using Json = …;`) y un `using static` no son dependencias de espacio de nombres y no se emiten como import: contarlos como de fuera mentiría en el número. En la complejidad cuentan `if`, los cuatro bucles, cada `case` —también cada brazo de una `switch expression`—, `catch`, el ternario y `&&` y `||`; `default` no, que no abre camino. Una propiedad con cuerpo de expresión es estado con nombre, no un método, pero su ternario cuenta dentro del método que la escribe. Los parámetros posicionales de un `record` son propiedades y son miembros; los de un `delegate` son su firma y no lo son.

**Qué falta**: la documentación de uso, que sigue prometiendo TS/JS en `model.md`, el `AGENTS.md` y las páginas de la app y del CLI.

**Veredicto**: C# está hecho dentro de **M61**. El checksum de un repositorio de TS/JS sigue sin moverse, y el de un repositorio C# es el mismo en el CLI y en el navegador.
