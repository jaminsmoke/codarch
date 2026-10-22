# La guía

> Esta es la **verdad** ✅ de la guía ✅ ✅. La web ✅ la genera ✅ ✅ (ADR 0034 ✅ ✅): una entrada
> empieza con un `##` ✅ y su línea siguiente ✅ dice la categoría ✅, el veredicto ✅ y la fecha ✅ ✅.

## Qué es esto

El [roadmap](../roadmap.md) **indexa** las **fases** ✅: M0 a M23 ✅, todas cerradas ✅. El detalle
de cada fase vive en la **hoja de ruta de la decisión que la trae** 🗺️, al lado de su ADR 🧭
([`docs/adr/`](../adr/index.md) 🧭).

Aquí están las **ideas** 🧪: las que sabemos qué queremos ✓ pero no cuándo ni cómo ✓, y las **mejoras
de lo que ya existe** 🔧, que quizá no merecen una fase ✓ pero sí un sitio donde mirar ✓.

Nada se pierde al estar aquí ✓: es el mismo "después" ✓, con más detalle ✓ y con un **veredicto** ⚖️
para cada idea ✓ (si merece fase ✓, si necesita un ADR ✓, o si es pequeña para arreglarla sin fase ✓).

## 📌 Los iconos

| Icono | Qué significa |
|---|---|
| 🧭 | una **decisión** (un ADR ✓) |
| 🗺️ | una **hoja de ruta** ✓ |
| 🧪 | una **idea** ✓ (una entrada de esta guía ✓) |
| ⚖️ | un **veredicto** ✓ |
| ✅ | **hecho** ✓ o **cerrada** ✓ |
| 🟡 | **en curso** ✓ |
| ⬜ | **sin empezar** ✓ |
| 🔧 | un **arreglo** ✓ (mejora sin fase ✓) |
| ⏳ | **esperar** ✓ |

Los ✓ y ✗ siguen significando **hecho** y **no hecho** ✓: los iconos son de otra cosa ✓.

## 📌 Las categorías

Cada entrada dice **qué clase de trabajo es** ✓ además de qué se decidió ✓. Las categorías son las de
un **changelog** ✓ ([ADR 0035](../adr/0031-0040/0035-la-guia-como-changelog.md) 🧭 ✓) y son un **set
cerrado** ✓:

| Categoría | Qué es |
|---|---|
| `feature` | algo **nuevo** ✓: una capacidad que antes no estaba ✓ |
| `fix` | un **arreglo** ✓: algo que prometía y no cumplía ✓ |
| `optimized` | lo mismo ✓, **más rápido** ✓ o más barato ✓ |
| `refactor` | lo mismo ✓, **mejor por dentro** ✓ |
| `docs` | **documentación** ✓: lo que se lee ✓, no lo que se ejecuta ✓ |
| `chore` | **mantenimiento** ✓: versiones ✓, repo ✓, herramientas ✓ |
| `security` | **seguridad** ✓: permisos ✓, secretos ✓, dependencias ✓ |
| `removed` | **quitar** ✓ algo que ya no se sostiene ✓ |

No todas se usan todos los días ✓: el día pinta **solo las que tienen algo** ✓, siempre en ese orden
✓. Y una entrada se **declara** ✓: no se deduce del veredicto ✓.

## 📌 La regla

- Una idea **entra en el roadmap** como fase cuando tiene un resultado que se puede ver ✓ y un
  **ADR** si cambia el modelo del producto o sus reglas ✓.
- Si lo que falta es una **decisión** (no trabajo ✓), se queda aquí ✓ hasta que la decisión esté
  tomada ✓.
- Si es una **mejora** de algo que ya existe ✓, no necesita fase ✓: se hace y se comprueba ✓.
- Los **plugins** tienen su propia hoja de ruta ✓ (dentro de su carpeta ✓), porque son piezas
  aparte ✓: el sistema de plugins no crece con cada plugin ✓.

## 📌 Cómo se coloca una idea aquí

1. Con una frase: **qué es** ✓ y **por qué** ✓.
2. Con una **categoría** ✓: feature ✓, fix ✓, docs ✓ — las de arriba ✓.
3. Con un **veredicto** ⚖️: fase ✓, ADR ✓, arreglo ✓, o esperar ✓.
4. Con **fecha** ✓: el registro va **por orden cronológico** ✓ y si una idea vieja vuelve, vuelve
   **a su sitio** ✓.
5. Cuando el veredicto sea "fase" ✓, la idea se mueve a la hoja de ruta de su decisión 🗺️ y aquí
   queda el rastro ✓ de por qué ✓.

La línea de metadatos lo dice todo ✓: `*categoría · veredicto · fecha*` ✓.

---

## El registro público de plugins
*feature · idea · 2026-10-21*

**Qué es** ✓: que terceros publiquen plugins ✓ y que las apps los puedan instalar ✓. Hoy los plugins
son **del repo** ✓: un equipo que escribe una regla para todo el mundo tiene que repartirla como
código ✓.

**Por qué** ✓: el valor de los plugins está en que los use **gente que no es CodArch** ✓.

**Qué falta** ✓: la confianza ✓. Un plugin es código arbitrario ✓ → hace falta **firma** ✓ (quién
lo publica ✓), un **registro** ✓ (dónde se busca ✓) y una **política de versiones** ✓ (qué pasa
cuando el plugin cambia el snapshot ✓ → el checksum ✓).

**Veredicto** ✓: **fase + ADR** ✓. Es una decisión de producto ✓ (abrir la puerta a terceros ✓) y
afecta a la distribución ✓.

**Una mitad ya está resuelta** ✓: los **addons** ✓ ([ADR 0029](../adr/0021-0030/0029-los-addons.md)
🧭 ✓) son **datos** ✓ — perfiles ✓, reglas ✓ y vistas guardadas ✓ — y repartir datos no necesita
firmar código ✓: basta un zip y un hash ✓ (el *Los addons* ✓). Lo que sigue haciendo falta es
**firmar y distribuir plugins** ✓ (código ✓), que es la otra mitad ✓.

**Tamaño** ✓: medio ✓. Lo difícil no es el registro ✓ (un índice y un endpoint ✓) sino la firma y
las reglas ✓.

## Las lentes de las extensiones
*feature · esperar · 2026-10-21*

**Qué es** ✓: que una extensión pueda **medir algo nuevo** ✓ y meterlo en el snapshot ✓ (por ejemplo,
las dependencias de NestJS ✓ o los módulos de un framework ✓).

**Por qué** ✓: es lo que haría las extensiones **verdaderamente útiles** ✓: no solo vistas ✓, sino
señales nuevas ✓.

**El problema** ✓: el **checksum** ✓. Si una lente depende de la extensión ✓, el snapshot depende de
lo instalado ✓ → el mismo código daría checksums distintos ✗ → el análisis dejaría de ser
reproducible ✗ (que es la propiedad que el producto protege con más cuidado ✓).

**Decidido** ✓ en [ADR 0029](../adr/0021-0030/0029-los-addons.md) 🧭 ✓: hoy **no** ✓. Un addon no añade
lentes ✓ («A» ✓), y la puerta queda abierta a «B» ✓ —el productor **dentro** del snapshot ✓ → «el
mismo código + los mismos addons = el mismo checksum» ✓ ✓— cuando la manera esté decidida ✓, con su
propio ADR ✓.

Mientras tanto, un addon que necesite una señal nueva la **calcula en su vista** ✓ (como hace el 3D ✓)
y no la comparte ✓: no puede pintarla ✓, ni verla en el PR ✓, ni preguntársela al agente ✓.

**Veredicto** ✓: **esperar** ✓ la variante «B» ✓: la manera tiene que estar decidida ✓ antes de
ofrecerla ✓.

**Tamaño** ✓: grande ✓. Y el primero en necesitarlo quizá sea el 3D ✓ (que ahora no toca el modelo ✓
✓).

## La vista 3D, a fondo
*feature · idea · 2026-10-21*

**Qué es** ✓: el octree ✓, el nivel de detalle ✓, las carpetas como contenedores ✓, las etiquetas ✓
y la comparación de dos momentos ✓.

**Veredicto** ✓: **en su propia guía** ✓ (`plugins/vista-3d/ROADMAP.md` ✓). Es un plugin ✓: no
necesita una fase del roadmap ✓ porque no toca el motor ✓ ✓.

**La excepción** ✓: si el nivel de detalle acaba siendo **del motor** ✓ (que ya sabe podar ✓, ADR
0019 ✓), entonces sí: una fase ✓, porque el motor cambia ✓.

## Lo que ya hay, mejorado
*fix · arreglo · 2026-10-21*

Estas **no** son fases ✓: son arreglos 🔧. Van aquí para que no se pierdan ✓.

### La API promete cosas que la app no hace (hecho ✅)

El contrato declaraba los paneles de la barra lateral y los modos de color de plugin, y **la app
no los pintaba**. Eso es una promesa que no se cumple, y lo peor de una promesa que no se cumple es
que alguien la cuente.

**Hecho** ✅: el contrato ahora promete **solo vistas** (una pestaña del mapa central), que es lo único
que la app sabe hacer. Los paneles y los modos de color se añadirán **cuando la app sepa
pintarlos**, no antes. El ADR 0028 lo dice, para que quien escriba un plugin no los busque.

### El diff de símbolos todavía no sabe de renombrados ✗

El diff empareja por nombre ✓; las cadenas sí reconocen renombrados ✓. El comentario del PR podría
decir "has renombrado `parseDiff`" ✓, y no lo dice ✗.

**Veredicto** ✓: **arreglo** ✓, sin fase ✓. La machinery ya existe ✓ (las cadenas ✓): es
conectarla ✓.

### Una mudanza con cambio a la vez rompe la cadena ✗

Si una función se muda **y** cambia de cuerpo a la vez ✓, la cadena se parte ✓ (el renombrado exige
el mismo hash ✓). Es el límite honesto ✓ que decidimos ✓, pero es un caso real ✓.

**Veredicto** ✓: **no arreglar todavía** ✓. Aflojar la regla crearía cadenas falsas ✓, que es peor
que una cadena partida ✓. Se puede añadir una señal de "probablemente es la misma" ✓ más adelante ✓
— y se haría en el diff ✓, no en la cadena ✓.

### La web no compara dos momentos ✗

La CLI sí ✓ (`codarch history --from --to` ✓); la web tiene la línea del tiempo ✓ pero no la
comparación ✓.

**Veredicto** ✓: **arreglo** ✓ o nada ✓. No es urgente ✓: la línea del tiempo ya da el contexto ✓.

### El layout: el mapa crecía la página (hecho ✅)

El `.map-frame` no tenía altura acotada ✗ → el SVG crecía con su propia relación de aspecto ✗ →
la página entera scrollea ✗ y el raíl, que tenía `overflow: auto` ✓, nunca scrolleaba ✓.

**Hecho** ✅: en la anchura ancha ✓ la app ocupa la pantalla ✓ (`100dvh` ✓), el raíl y el inspector
scrollean solos ✓ y el mapa se ajusta a lo que queda ✓. En la anchura estrecha ✓ (donde el inspector
se apila ✓) el mapa ocupa la pantalla ✓ y la página scrollea solo para el inspector ✓.

Y con eso, el **zoom** ✓: botones `+` ✓, `−` ✓ y `Ajustar` ✓, más la rueda ✓ (que acerca
centrado en el puntero ✓). La distribución del mapa **no** cambia ✓: lo que cambia es el rectángulo
visible ✓, así que acercar es gratis ✓.

### El mapa: los nombres no se veían (hecho ✅)

Dos fallos que llevaban desde siempre ✓ y que solo se veían al mirar la pantalla ✓:

1. **El texto estaba dentro del `<rect>`** ✓. En SVG un `<rect>` no admite hijos ✓ → el texto se
   dibujaba siempre con **tamaño cero** ✓ → los nombres de los ficheros y de las carpetas **nunca** se
   han visto ✓. Ahora el texto es hermano del rect ✓.
2. **El marco no se medía** ✓: el `ResizeObserver` no llegaba a disparar ✓ → el mapa se dibujaba
   siempre para 1400×900 ✓ y se escalaba a la mitad ✓ → un texto de 10,5 px quedaba en 5 ✓.
   Ahora se mide al montar ✓, se observa el marco ✓ y se mide al redimensionar ✓.

**Hecho** ✅: los nombres se leen ✓ ("App.tsx" ✓, "PrPanel.tsx" ✓, "APPS" ✓) ✓.

### El nombre de los bloques (hecho ✅)

Empezó mal ✓: el nombre se pintaba como un texto aparte ✓ y se calculaba a mano cuánto cabía ✗.
Salía recortado ("analy…" ✗), se desbordaba ✗ y los bloques pequeños se quedaban sin nombre ✗.

**El enfoque definitivo**: el nombre **es del bloque** ✓. Cada bloque lleva un `foreignObject` con
texto HTML dentro ✓ y es el **navegador** el que lo envuelve ✓ y lo recorta ✓. Así **no puede
salirse del bloque** ✓, por diseño ✓, diga lo que diga el nombre ✓.

Lo único que se decide en código es lo que el navegador no puede adivinar ✓:

- **El tamaño de la fuente** ✓, del lado corto del bloque ✓ (de 4 a 11 px ✓).
- **Si va en vertical** ✓ (`writing-mode: vertical-rl` ✓) cuando el bloque es alto y estrecho ✓.
- **Si el bloque da para algo** ✓: por debajo de dos píxeles no hay nada que enseñar ✓.

Medido en el mapa de este repo ✓: **215 labels** ✓, **ninguno desbordado** ✓ y **85 en vertical** ✓.
Los que se quedan sin nombre son bloques de un píxel ✓, donde no cabe ni una letra ✓.

### El 3D: las cajas no tienen etiqueta ✗

Con 200 cajas no se sabe cuál es cuál ✓.

**Veredicto** ✓: en la guía del plugin ✓ ✓.

### Las reglas del addon no llegan al MCP ✓

Un addon puede aportar reglas ✓ (declarativas ✓) y la app las ve ✓, pero el MCP ✓ no las veía ✗
porque lee el snapshot ✓ y las reglas viven en la configuración ✓.

**Veredicto** ✓: **arreglado** ✓. El MCP lee la configuración ✓ como hace el CLI ✓:
`get_project_config` devuelve el perfil ✓, las capas ✓, las reglas con su origen ✓ (`config`, `profile`
o `addon:<nombre>`) y los addons declarados con sus vistas guardadas ✓.

## Los addons
*feature · fase · 2026-10-22*

**Qué es** ✓: **conocimiento declarativo** ✓ — perfiles ✓, reglas ✓ y vistas guardadas ✓ — que se
instala copiando una carpeta ✓ y que viaja con el repo ✓.

**Por qué** ✓: un equipo que trabaja con un framework no quiere una vista nueva ✗: quiere sus capas
✓, sus reglas ✓ y una vista inicial razonable ✓ puestas desde el primer día ✓, y que las tengan sus
compañeros ✓ y su CI ✓. Hoy eso es un README con un bloque para copiar ✗.

**Decisión** ✓: [ADR 0029](../adr/0021-0030/0029-los-addons.md) 🧭 ✓. Un addon **no** aporta código ✓
(eso es un plugin ✓, ADR 0028 ✓) ni lentes ✓ (eso cambia el checksum ✗). Vive en
`addons/<nombre>/` ✓ y el repo lo declara en `.codarch.yml` ✓.

**La frontera, en una línea** ✓: el **plugin** aporta **código** ✓; el **addon** aporta
**conocimiento** ✓; la **lente** aporta **medidas** ✓ y es la única que toca el checksum ✓.

**Veredicto** ✓: **fase M16** ✓, en la hoja de
[ADR 0029](../adr/0021-0030/0029-los-addons.roadmap.md) 🗺️ ✓. Estuvo aquí y ya es fase ✓: queda el
rastro de por qué ✓.

## Los documentos: cada decisión con su hoja de ruta
*docs · fase · 2026-10-22*

**Qué es** ✓: que los documentos crezcan sin ensuciar ✓. Los ADR en una carpeta plana ✓, el roadmap
central con el detalle de todo ✓ y la guía con las ideas numeradas ✓: ampliar una decisión obliga a
tocar ficheros que hablan de otras ✓.

**Decisión** ✓: [ADR 0031](../adr/0031-0040/0031-los-documentos.md) 🧭 ✓. Los ADR van en **carpetas
de diez** ✓, cada uno con su **hoja de ruta** 🗺️ al lado ✓; `docs/roadmap.md` ✓ queda como **índice** ✓
y esta guía ✓ como **registro cronológico** ✓.

**Veredicto** ✓: **fase M18** ✓, en la hoja de
[ADR 0031](../adr/0031-0040/0031-los-documentos.roadmap.md) 🗺️ ✓. Hecho ✅.

## Los documentos, con iconos y diagramas
*docs · fase · 2026-10-22*

**Qué es** ✓: que los documentos no sean un muro de texto plano ✓. Un markdown sin señales se lee
igual de rápido y de lento ✓, y las decisiones quedan enterradas ✓.

**Decisión** ✓: [ADR 0031](../adr/0031-0040/0031-los-documentos.md) 🧭 ✓ (su §6 ✓). Un set
**pequeño** de iconos ✓ con su leyenda ✓ —de categoría ✓ y de estado ✓— y **mermaid** ✓ donde el
diagrama ahorra un párrafo ✓.

**Veredicto** ✓: **fase M19** ✓, en la hoja de
[ADR 0031](../adr/0031-0040/0031-los-documentos.roadmap.md) 🗺️ ✓. Hecho ✅.

## Alpha: que la versión lo diga
*chore · fase · 2026-10-22*

**Qué es** ✓: que el producto diga que es alpha ✓. La funcionalidad está ✓; el producto todavía
no ✓: se le cambian las cosas ✓ y la app de escritorio es una copia ✓ de la web ✓.

**Decisión** ✓: [ADR 0032](../adr/0031-0040/0032-las-versiones-y-las-actualizaciones.md) 🧭 ✓
(§6 ✓). La versión lleva prerelease ✓ (`0.3.0-alpha.1` ✓) ✓, en npm va a la etiqueta `next` ✓ para
que `latest` ✓ se quede con la última normal ✓, y el README ✓ lo dice arriba ✓ ⚖️ ✓.

Lo que **sí** se promete ✓: el modelo `cc.json` 2.x ✓ y su checksum ✓.

**Veredicto** ✓: **fase M21** ✓, en la hoja de
[ADR 0032](../adr/0031-0040/0032-las-versiones-y-las-actualizaciones.roadmap.md) 🗺️ ✓. Hecho ✅.

## Abrir el repo
*chore · fase · 2026-10-22*

**Qué es** ✓: que el código fuente de CodArch sea público ✓. El código ya sale ✓ —el CLI está en npm
✓ y la acción ✓ en su propio repo público ✓—; lo que sigue privado ✓ era el repo ✓ y sus documentos
✓.

**Por qué** ✓: el **registro público de plugins** 🧪 necesita que el repo sea público ✓: nadie publica
un plugin en un repo que no puede ver ✓. Y el **clean-room** ✓ (ADR 0001 ✓) se lee mejor cuando la
implementación está a la vista ✓.

**Decisión** ✓: [ADR 0033](../adr/0031-0040/0033-abrir-el-repo.md) 🧭 ✓. La licencia se queda en
**MIT** ✓, la marca ⚖️ no se concede con ella ✓, y antes de abrir ✓ van los papeles ✓:
`SECURITY.md` ✓, `CONTRIBUTING.md` ✓, `NOTICE.md` ✓, `TRADEMARK.md` ✓ y la nota de privacidad ✓.

**Veredicto** ✓: **fase M22** ✓, en la hoja de
[ADR 0033](../adr/0031-0040/0033-abrir-el-repo.roadmap.md) 🗺️ ✓. Las medidas ya están ✅; el repo es
público ✅ ✅.

## La web del proyecto
*feature · fase · 2026-10-22*

**Qué es** ✓: que el repo tenga **puerta** ✓ ✓: qué es CodArch ✓, cómo se ve ✓, cómo se instala ✓ y
los documentos ✓ **navegables** ✓ ✓.

**Decisión** ✓: [ADR 0034](../adr/0031-0040/0034-la-web-del-proyecto.md) 🧭 ✓. Una web en
`apps/site` ✓ (React ✓ + Vite ✓ + router ✓ ✓) que **se genera del markdown** ✓ ✓ —una sola verdad ✓
✓— y que se publica en GitHub Pages ✅ ✅.

**Veredicto** ✓: **fase M23** ✓, en la hoja de
[ADR 0034](../adr/0031-0040/0034-la-web-del-proyecto.roadmap.md) 🗺️ ✓. La web está publicada ✅ en
`jaminsmoke.github.io/codarch` ✅ ✅ ✅.
