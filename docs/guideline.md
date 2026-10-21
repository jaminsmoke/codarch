# La guía de lo que viene después

**Estado:** viva · **Fecha:** 2026-10-21

## Qué es esto

El [roadmap](roadmap.md) tiene las **fases**: M0 a M15 ✓, todas cerradas ✓. Son trabajo con un
resultado que se puede ver ✓.

Aquí están las **ideas** que todavía no son fase ✓: las que sabemos qué queremos ✓ pero no sabemos
cuándo ni cómo ✓. También las que son **mejoras de lo que ya existe** ✓, que quizá no merecen una
fase pero sí un sitio donde mirar ✓.

Nada se pierde al estar aquí ✓: es el mismo "después" ✓, con más detalle ✓ y con un **veredicto**
para cada idea ✓ (si merece fase ✓, si necesita un ADR ✓, o si es pequeña para arreglarla sin
fase ✓).

## La regla

- Una idea **entra en el roadmap** como fase cuando tiene un resultado que se puede ver ✓ y un
  **ADR** si cambia el modelo del producto o sus reglas ✓.
- Si lo que falta es una **decisión** (no trabajo ✓), se queda aquí ✓ hasta que la decisión esté
  tomada ✓.
- Si es una **mejora** de algo que ya existe ✓, no necesita fase ✓: se hace y se comprueba ✓.
- Los **plugins** tienen su propia hoja de ruta ✓ (dentro de su carpeta ✓), porque son piezas
  aparte ✓: el sistema de plugins no crece con cada plugin ✓.

---

## 1. El registro público de plugins

**Qué es** ✓: que terceros publiquen plugins ✓ y que las apps los puedan instalar ✓. Hoy los plugins
son **del repo** ✓: un equipo que escribe una regla para todo el mundo tiene que repartirla como
código ✓.

**Por qué** ✓: el valor de los plugins está en que los use **gente que no es CodArch** ✓.

**Qué falta** ✓: la confianza ✓. Un plugin es código arbitrario ✓ → hace falta **firma** ✓ (quién
lo publica ✓), un **registro** ✓ (dónde se busca ✓) y una **política de versiones** ✓ (qué pasa
cuando el plugin cambia el snapshot ✓ → el checksum ✓).

**Veredicto** ✓: **fase + ADR** ✓. Es una decisión de producto ✓ (abrir la puerta a terceros ✓) y
afecta a la distribución ✓.

**Tamaño** ✓: medio ✓. Lo difícil no es el registro ✓ (un índice y un endpoint ✓) sino la firma y
las reglas ✓.

## 2. Las lentes de los plugins

**Qué es** ✓: que un plugin pueda **medir algo nuevo** ✓ y meterlo en el snapshot ✓ (por ejemplo,
las dependencias de NestJS ✓ o los módulos de un framework ✓).

**Por qué** ✓: es lo que haría los plugins **verdaderamente útiles** ✓: no solo vistas ✓, sino
señales nuevas ✓.

**Qué falta** ✓: el **checksum** ✓. Si una lente depende del plugin ✓, el snapshot depende de lo
instalado ✓ → el mismo código daría checksums distintos ✗ → el análisis dejaría de ser reproducible
✗ (que es la propiedad que el producto protege con más cuidado ✓).

**Veredicto** ✓: **ADR primero** ✓, fase después ✓. La decisión es conceptual ✓: hay una salida
razonable ✓ (el hash del plugin **dentro** del snapshot ✓ → "el mismo código + los mismos plugins =
el mismo checksum" ✓ ✓), pero hay que elegirla antes de escribir código ✓.

**Tamaño** ✓: grande ✓. Y el primero en necesitarlo quizá sea el 3D ✓ (que ahora no toca el modelo ✓
✓).

## 3. La vista 3D, a fondo

**Qué es** ✓: el octree ✓, el nivel de detalle ✓, las carpetas como contenedores ✓, las etiquetas ✓
y la comparación de dos momentos ✓.

**Veredicto** ✓: **en su propia guía** ✓ (`plugins/vista-3d/ROADMAP.md` ✓). Es un plugin ✓: no
necesita una fase del roadmap ✓ porque no toca el motor ✓ ✓.

**La excepción** ✓: si el nivel de detalle acaba siendo **del motor** ✓ (que ya sabe podar ✓, ADR
0019 ✓), entonces sí: una fase ✓, porque el motor cambia ✓.

## 4. Lo que ya hay, mejorado

Estas **no** son fases ✓: son arreglos ✓. Van aquí para que no se pierdan ✓.

### 4.1 La API promete cosas que la app no hace ✗

El contrato declara \`panels\` ✓ y los modos de color de plugin ✓, y **la app no los pinta** ✗. Eso
es una promesa que no se cumple ✓, y lo peor de una promesa que no se cumple es que alguien la
cuente ✓.

**Veredicto** ✓: decidir ✓. O se implementan ✓ (el panel lateral ya existe ✓: sería una línea de
contexto ✓ y un hueco en la barra ✓) o se **sacan** del contrato ✓ y se avisa de que no hay
paneles todavía ✓. **Prefiero sacarlos** ✓ hasta que alguien los pida ✓: el contrato debe poder
cumplirse ✓ siempre ✓.

### 4.2 El diff de símbolos todavía no sabe de renombrados ✗

El diff empareja por nombre ✓; las cadenas sí reconocen renombrados ✓. El comentario del PR podría
decir "has renombrado \`parseDiff\`" ✓, y no lo dice ✗.

**Veredicto** ✓: arreglo ✓, sin fase ✓. La machinery ya existe ✓ (las cadenas ✓): es conectarla ✓.

### 4.3 Una mudanza con cambio a la vez rompe la cadena ✗

Si una función se muda **y** cambia de cuerpo a la vez ✓, la cadena se parte ✓ (el renombrado exige
el mismo hash ✓). Es el límite honesto ✓ que decidimos ✓, pero es un caso real ✓.

**Veredicto** ✓: **no arreglar todavía** ✓. Aflojar la regla crearía cadenas falsas ✓, que es peor
que una cadena partida ✓. Se puede añadir una señal de "probablemente es la misma" ✓ más adelante ✓
— y se haría en el diff ✓, no en la cadena ✓.

### 4.4 La web no compara dos momentos ✗

La CLI sí ✓ (\`codarch history --from --to\` ✓); la web tiene la línea del tiempo ✓ pero no la
comparación ✓.

**Veredicto** ✓: arreglo ✓ o nada ✓. No es urgente ✓: la línea del tiempo ya da el contexto ✓.

### 4.5 El 3D: las cajas no tienen etiqueta ✗

Con 200 cajas no se sabe cuál es cuál ✓.

**Veredicto** ✓: en la guía del plugin ✓ ✓.

### 4.6 Las reglas del plugin no llegan al MCP ✗

Un plugin puede aportar reglas ✓ (declarativas ✓) y la app las ve ✓, pero el MCP ✓ no las ve ✗
porque lee el snapshot ✓ y las reglas viven en la configuración ✓.

**Veredicto** ✓: mirar ✓. El MCP debería leer la configuración ✓ como hace el CLI ✓ ✓.

---

## Cómo se coloca una idea aquí

1. Con una frase: **qué es** ✓ y **por qué** ✓.
2. Con lo que **falta** para decidirla ✓ (si es que falta ✓).
3. Con un **veredicto** ✓: fase ✓, ADR ✓, arreglo ✓, o esperar ✓.
4. Cuando el veredicto sea "fase" ✓, la idea se mueve al roadmap ✓ con su número ✓ y su ADR ✓, y
   aquí queda el rastro ✓ de por qué ✓.
