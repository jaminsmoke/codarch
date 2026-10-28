---
title: Java entra en el mapa, con árbol y sin leer el manifiesto
date: "2026-10-28"
category: feature
verdict: fase
---

**Qué era**: el mapa solo miraba TS/JS. Un repositorio Java se veía casi vacío: sus ficheros no existían para el recorrido, no había aristas y no había complejidad. Rust se medía a mano, sin árbol, y Java ni eso.

**Qué es**: Java entra entero. Un `.java` es un nodo con `loc`, `rloc`, `functions`, `maxComplexity` y `maxFunctionLength`; con sus símbolos —clase, interfaz, enum y `record`, más métodos y constructores— y su complejidad, con el mismo hash de cuerpo que TS para que un renombrado no rompa la identidad; con sus miembros, que son los campos y los componentes de un `record`; y con sus `import` como aristas del grafo —solo los `import` explícitos: una clase del mismo paquete no lleva y no crea arista—. Todo sale de un solo recorrido del árbol, igual que en TS, y hay dos parsers: el nativo del CLI y el `.wasm` del navegador, con el mismo código de medición, así que el checksum coincide. El navegador ya lee los `.java` de la carpeta y carga la gramática.

**Por qué así**: la resolución no lee `pom.xml` ni `build.gradle`. El paquete de un fichero es su ruta y su clase es su nombre, así que `import com.acme.billing.Invoice;` busca un fichero que acabe en `com/acme/billing/Invoice.java`, viva en `src/main/java/…` o en la raíz. `import static com.acme.Money.ZERO;` prueba primero la clase del miembro y después la que lo contiene, y el mismo segundo candidato resuelve las clases anidadas. Lo que no es arista se cuenta con su nombre: los paquetes de la plataforma (`java.`, `javax.`, `jdk.`…) son builtin, un paquete entero (`com.acme.*`) es externo y no crea arista, y un import cuyo paquete está en el repo pero cuya clase no aparece es un import roto, que se cuenta con su línea. Un método de interfaz sin cuerpo es símbolo y no métrica, un `switch` cuenta una vez por etiqueta —también en la forma de flecha— y una lambda no se mide aparte: su complejidad es la del método que la contiene.

**Qué falta**: Python, Go y C#, y la documentación de uso, que sigue prometiendo TS/JS.

**Veredicto**: Java está hecho dentro de **M61**. El checksum de un repositorio de TS/JS no se mueve, y el de un repositorio Java es el mismo en el CLI y en el navegador.
