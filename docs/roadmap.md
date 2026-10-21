# Roadmap

Cada milestone deja el producto funcionando y verificable. Nada de big-bang.

## Estado

Hoy CodArch tiene:

- **CLI** (`codarch`): `analyze`, `diff`, `render`, `inspect` y `serve`. Publicado en npm.
- **Modelo** `cc.json` 2.x: árbol de ficheros, métricas, grafo de dependencias, ciclos, lente de
  migración y checksum determinista. Es la verdad del producto y la comparten todas las apps.
- **Reglas** de arquitectura en `.codarch.yml`: capas, prohibiciones, umbrales y ciclos, con severidad
  y política de bloqueo.
- **MCP** de solo lectura: seis consultas para agentes.
- **GitHub Action**: analiza base y head del PR, comenta el resultado y bloquea si la política falla.
- **App web**: mapa, inspector, vista de PR, nivel de detalle para repos grandes y análisis de una
  carpeta en el navegador con el mismo checksum que el CLI.
- **App de escritorio**: Electron con su propia interfaz, análisis nativo con git, menú del sistema
  e instaladores sin firmar.

Las fases M0–M4, M6, M7 y M8 están cerradas. M5 está cerrada en lo funcional; queda pulido.

---

## M0 — Modelo y mapa, sin parsers

**Objetivo:** validar el modelo de datos y el render 2D sin escribir un solo parser.

Entrada: un `cc.json` real de CodeCharta (el de su propia `visualization/`).

```
$ codarch render codecharta.cc.json -o map.html
```

Criterios de aceptación:

- [x] Importa `cc.json` 2.x validando la estructura (ids, métricas, aristas).
- [x] Importa `cc.json` 1.x mediante un normalizador a 2.x (desnudo y `{ checksum, data }`).
- [x] Treemap 2D: área = `rloc`, color = métrica elegible, altura/borde = jerarquía.
- [x] Hover con métricas, búsqueda, clic para enfocar una carpeta.
- [x] HTML único, sin servidor, sin red: 489.663 bytes con la muestra real de 2.003 ficheros.
- [x] 5k nodos renderizados en < 500 ms (mediana ~27 ms con `npm run bench:render`).
- [x] Salida determinista: mismo input, mismo HTML (salvo hash de build).
- [x] Comparación visual lado a lado con el mapa de CodeCharta del mismo commit.

**Por qué primero:** elimina el riesgo del modelo y del render antes de invertir en parsers. Y nos
obliga a mirar los datos del rival con nuestros propios ojos.

## M1 — Parser propio de TypeScript

**Estado:** cerrado.

- [x] Recorrido del repo, normalización de rutas, `.gitignore` raíz y anidados, negaciones.
- [x] tree-sitter: `loc`, `rloc`, `functions`, `maxComplexity`, `maxFunctionLength`.
- [x] Resolución de imports: relativos, `tsconfig` paths, workspaces, `index.ts`, type-only, dinámicos, `require`.
- [x] Grafo: `fanIn`, `fanOut`, ciclos (SCC + self-loops), `cycleSize`, `dependencyLevel`.
- [x] `codarch analyze . -o .codarch/` produce snapshot + mapa.
- [x] Test de determinismo: dos ejecuciones, mismo snapshot y mismo checksum.
- [x] Benchmark de analyze sobre 2.000 ficheros sintéticos: 2,6 s y 311 MB RSS.
- [x] Benchmark sobre el código fuente de CodeCharta `visualization/` (1.756 ficheros): 9,4 s de
  análisis, 5.595 aristas y 2,2 MB de snapshot. Destapó un bug del resolutor: un fichero con punto
  en el nombre ("app.config") se tomaba por con extensión y no se resolvía. Los imports sin resolver
  pasaron de 3.813 a 3 (y las aristas de 1.834 a 5.595).

Métricas del snapshot: `loc`, `rloc`, `functions`, `maxComplexity`, `maxFunctionLength`, `imports`,
`externalImports`, `builtinImports`, `typeOnlyImports`, `unresolvedImports`, `fanIn`, `fanOut`,
`inCycle`, `cycleSize`, `dependencyLevel`.

El snapshot es `cc.json` 2.0 con lentes `metrics` y `dependency`. El checksum es MD5 de la
serialización canónica de `{ files, lenses }`, sin timestamps ni rutas absolutas. El riesgo se calcula
en `packages/metrics` y lo comparten render y MCP; renormaliza sus pesos si falta churn o complejidad.

## M2 — Diff y PR

**Estado:** cerrado (MVP repo-local). La publicación de la acción y del CLI queda para M3.

- [x] Churn y autores desde git (`number_of_commits`, `number_of_authors`) para completar la lente de riesgo.
- [x] Test de churn con repositorio temporal y test de determinismo con historial.
- [x] `codarch diff base.cc.json head.cc.json` → ficheros, métricas, aristas, ciclos y hotspots.
- [x] `report.json` estable y versionado (`schemaVersion: "1.0"`), sin timestamps.
- [x] Gate básico `--fail-on cycles|violations|hotspots|any` con salida `2`.
- [x] Benchmark de diff: 2.000 → 2.010 ficheros en ~9 ms, reporte de 28 KB.
- [x] Capas violadas y reglas de arquitectura (`forbidden`, `threshold`, `cycles`).
- [x] Reglas en `.codarch.yml`: capas, prohibiciones, umbrales.
- [x] Doble política sobre el mismo commit (`info`/`warn`/`error`; solo `error` introducido bloquea).
- [x] GitHub Action: comentario en el PR + artefacto con el mapa.
- [x] Workflow de PR con `fetch-depth: 0`, permisos de escritura y política `fail-on` configurable.

## M3 — MCP y distribución

**Estado:** cerrado. El servidor MCP local, el CLI publicado en npm y la acción pública funcionan de
extremo a extremo, incluida la prueba desde un repositorio externo.

- [x] `get_architecture_map`, `find_hotspots`, `check_change_impact`, `list_violations`, `explain_module`.
- [x] Las herramientas devuelven datos del snapshot, nunca texto inventado.
- [x] El agente puede pedir el mapa de un PR concreto si su snapshot/reporte están en disco (artefactos de la acción o generados localmente).
- [x] Riesgo compartido entre render y MCP; ciclos verificados por SCC sobre las aristas del snapshot.
- [x] 25 tests de herramientas, servidor, carga de artefactos y raíces múltiples, incluido transporte MCP en memoria, y smoke stdio contra artefactos reales.
- [x] Build reproducible de un paquete `codarch` único con esbuild; assets del mapa copiados junto al bundle.
- [x] Tarball `codarch@0.1.0` (~48 KB) instalado en un proyecto limpio y validado con `analyze`, `inspect`, `diff` y `render`.
- [x] Publicar `codarch@0.1.0` en npm.
- [x] Publicar `codarch@0.1.1` con la lente de migración; `latest` apunta a esa versión.
- [x] Publicar `codarch@0.1.2` con el servidor local (`serve`) y el modo live.
- [x] Publicar `codarch@0.1.3` con persistencia y atajos en la app web; `latest` apunta a esa versión.
- [x] Publicar `codarch@0.1.4` con el estado de vista en la URL, la carga por URL y la navegación por
  flechas; `latest` apunta a esa versión y la acción pública instala ya esa versión.
- [x] Publicar `codarch@0.2.0` con la lente de dominio: catálogo de perfiles, generador de capas y
  la migración en el reporte, el comentario del PR y el MCP. `latest` apunta a esa versión y la
  acción pública instala ya esa versión.
- [x] La acción instala la versión publicada del CLI; `check:action` lo verifica para que no se desincronice.
- [x] La acción instala `codarch` desde npm y ya no ejecuta `npm ci` sobre el proyecto analizado.
- [x] Repo público `jaminsmoke/codarch-action@v1`, generado desde `apps/github-action` con `npm run sync:action`.
- [x] Prueba externa en `jaminsmoke/codarch-action-smoke`: comentario, artefacto, análisis base/head y gate con exit `2`.

## M4 — Lente de migración

**Estado:** cerrado (v1). Decisión en [ADR 0016](adr/0016-lente-migracion.md); plan en
[`migration.md`](migration.md).

- [x] LOC por lenguaje (TS, JS, Rust, WASM, Node) y estado `js|rust|bridge|native` por fichero.
- [x] Aristas FFI para imports `.wasm`/`.node` y conteo de cruces por fichero.
- [x] Detección de puentes napi/`wasm_bindgen`/`WebAssembly` sin inventar aristas.
- [x] "Deuda de migración" `(maxComplexity + 1) × (1 + fanIn)`, sin líneas.
- [x] Métricas `migrationDebt` y `ffiCrossings` visibles en el mapa, `inspect` y `analyze`.
- [x] Validación sobre este repo: 104 ficheros, 13.159 rloc TS/JS, deuda 2.330 y plan por fases.

Límites: Rust solo se mide con escáner léxico; las aristas napi no se observan sin el glue generado.

## M5 — App web

**Estado:** cerrada en lo funcional; queda pulido (iconos propios hechos, queda afinar el detalle).

App web en `apps/web` (React + Vite) sobre `@codarch/render`, con mapa y vista de PR.

- [x] Cargar un `snapshot.cc.json` local (botón o drag & drop) y una demo incluida.
- [x] Reutilizar `buildRenderModel` y `layoutMap`; layout dinámico al tamaño del contenedor.
- [x] Selector de área/color, búsqueda por ruta y ficha de fichero.
- [x] Panel de migración: estratos por lenguaje, estados, puentes, FFI y top de deuda.
- [x] Color por estado (`js`, `rust`, `bridge`, `native`) y por cualquier métrica.
- [x] Cargar `report.json` y vista de PR: resumen, reglas, hotspots, ciclos y ficheros.
- [x] Clic en una fila del PR para enfocar el fichero en el mapa.
- [x] Foco por carpeta: clic en la cabecera de una carpeta y breadcrumb para volver.
- [x] Menú **Abrir repositorio o archivo**; el repositorio carga `.codarch/snapshot.cc.json` y `.codarch/report.json`.
- [x] Navegación por teclado completa: flechas, Escape y foco inicial.
- [x] Cargar snapshots/reportes por URL y servir con `codarch serve`; build estático ya disponible.
- [x] Recordar el último snapshot/reporte y el estado de vista.

## M5.1 — Básicos de uso

**Estado:** cerrada.

- [x] Abrir repositorio por carpeta con File System Access API; fallback `webkitdirectory`.
- [x] Abrir un `cc.json` suelto y cargar el reporte desde la pestaña PR.
- [x] Foco por carpeta y breadcrumb.
- [x] `codarch serve`: analiza al arrancar, sirve el build web y los artefactos; live + SSE.
- [x] Elegir carpeta desde la web, cambiar de repo y alternar live/stop sin reiniciar.
- [x] `npm run web:dev` arranca y para el servidor automáticamente; `CODARCH_NO_AUTOSERVE=1` lo evita.
- [x] Persistencia local del último proyecto con artefactos y de las preferencias de área/color.
- [x] Atajos básicos: `/` busca, `Enter` abre el primer resultado, `Esc` limpia foco/selección.
- [x] Carga por URL y enlaces compartibles con el estado de vista (`area`, `color`, `focus`, `file`, `tab`, `src`, `report`); decisión en [ADR 0018](adr/0018-estado-vista-en-la-url.md).
- [x] Navegación por flechas entre celdas y foco inicial del mapa.
- [x] Manejo explícito de snapshots grandes: nivel de detalle por tamaño y menos nodos por celda; decisión en [ADR 0019](adr/0019-nivel-de-detalle-del-mapa.md).

## M6 — Análisis en el navegador

**Estado:** cerrado. El navegador analiza una carpeta con la misma gramática y el mismo código que el
CLI, y el snapshot que sale tiene su checksum.

- [x] Parser TS/JS en el navegador (tree-sitter WASM con la gramática del propio paquete
  `tree-sitter-typescript`); decisión en [ADR 0020](adr/0020-analisis-en-el-navegador.md).
- [x] Mismas métricas y mismo checksum que el CLI: medición compartida y test de paridad.
- [x] Puerto de sistema de ficheros y núcleo del análisis sin `node:fs` ni git; el snapshot del
  fichero en memoria tiene el mismo checksum que el del CLI.
- [x] Worker con las gramáticas y el núcleo del CLI: el análisis no bloquea la interfaz.
- [x] Hash en JavaScript puro (`@noble/hashes`) para que el navegador calcule ids y checksum igual
  que el CLI.
- [x] Lector de carpetas con File System Access API y botón **Analizar carpeta aquí…** en la app.
- [x] Progreso fino por fichero y cancelación: el botón **Cancelar** corta el análisis al momento
  (terminar el worker), y se puede cortar también la lectura de ficheros.
- [x] Churn y git fuera del navegador; el snapshot sale sin historial, como el del CLI con
  `--no-git`.

## M7 — App de escritorio

**Estado:** cerrado. Electron con su propia interfaz, sin importing nada de `apps/web`; el motor es el
mismo. Decisión en [ADR 0021](adr/0021-app-de-escritorio.md).

- [x] Empaquetado de escritorio con el mismo build web.
- [x] Analizador local integrado (el CLI en proceso, sin servidor).
- [x] Diálogo de carpeta nativo y apertura de fichero.
- [x] Menú nativo, atajos de sistema (`Cmd/Ctrl+O`, `Cmd/Ctrl+Shift+O`) y "abrir con" desde el
  explorador de archivos: una carpeta se analiza, un `cc.json` se abre como snapshot y un
  `report.json` como reporte.
- [x] Instaladores **sin firmar** para Windows (NSIS y portable), macOS (dmg) y Linux (AppImage y
  deb), con electron-builder y un workflow de CI. Sin firma, el sistema avisa al usuario; firmarlo
  cuesta dinero y queda para cuando el producto lo justifique.

## M8 — La migración, donde ya faltaba

**Estado:** cerrado. La lente de migración se ve en el PR y el agente puede preguntar por ella.
Decisión en [ADR 0022](adr/0022-la-migracion-donde-faltaba.md).

- [x] El `report.json` tiene sección de migración: estado por lenguaje y categoría, deuda, cruces
  FFI y los ficheros cuya deuda ha cambiado.
- [x] El MCP gana `get_migration_plan`: el plan de migración, los ficheros con más deuda y cómo ha
  cambiado respecto a la base.
- [x] El comentario del PR muestra la deuda y los cruces FFI, con el detalle de lo que ha cambiado.
- [x] La vista de PR de la web muestra lo mismo.
- [x] `schemaVersion` del reporte a `1.1` y **obligatorio**: los lectores reconstruyen los reportes
  de versiones anteriores a la actual, y lo que no se pudo medir se marca con `null` en vez de
  inventar ceros. Un solo lector del reporte, en `@codarch/metrics`, para la web, el escritorio y el
  MCP.

## M9 — Lente de dominio, por pasos

**Estado:** M9.1 cerrada (el catálogo). M9.2 (el generador) es el siguiente paso; endurecer las
reglas del perfil para que bloqueen se decide en su momento, mirando cómo esté el código.

Decisión en [ADR 0023](adr/0023-lente-de-dominio-por-pasos.md).

- [x] **M9.1** Catálogo de perfiles declarativos (`capas`, `hexagonal`, `onion`, `ddd`): `.codarch.yml`
  acepta `profile: <id>` y las reglas del perfil se añaden a las del equipo.
- [x] Las reglas del perfil entran **como aviso** (`warn`): consultan, no bloquean. El equipo las
  sube a `error` escribiéndolas otra vez, cuando el código esté listo.
- [x] El reporte dice qué perfil se aplicó (`rules.profile`) y de dónde sale cada regla
  (`source`), y el comando `codarch profiles` lista el catálogo.
- [x] **M9.2** Generador, versión 0.01: `codarch suggest` agrupa por carpeta, ordena por dependencia y
  propone capas y reglas. Dice además qué perfil del catálogo encaja y qué reglas incumple el código
  hoy. Si encaja un perfil, la propuesta usa su convención (no la que deduce el código, que con una
  violation sale invertida). Propone, no decide.
- [x] **M9.3** Endurecer, cuando toque: `profile_severity: error` sube las reglas del perfil a
  bloqueo. Sigue siendo una decisión del equipo (y por defecto son avisos).
- [x] **M9.4** Perfiles propios del equipo, en el propio archivo de reglas (`profiles:`), con la
  misma forma que los del catálogo.
- [x] Las apps usan todo esto: el panel de PR de la web y del escritorio enseñan el perfil y
  marcan de dónde sale cada regla; el MCP devuelve el perfil en `list_violations`.

## M10 — La evolución temporal

**Estado:** cerrado. La historia del repositorio se guarda, se compara y se ve en las dos apps.
Decisión en [ADR 0024](adr/0024-evolucion-temporal.md).

- [x] **M10.1** La lente de calor: el mapa colorea por commits y el panel lateral lista los
  ficheros más tocados. Los datos ya venían del churn de git.
- [x] **M10.2** La historia, dentro del repo: `codarch analyze --history` guarda la foto en
  `.codarch-history/` (fuera de `.codarch/`, que está ignorado por git, para que la historia sí se
  pueda compartir) y `codarch history` lista la línea del tiempo. El snapshot sigue siendo
  determinista: la fecha va en el índice, nunca dentro del snapshot.
- [x] **M10.3** Comparar dos momentos: `codarch history --from <foto> --to <foto>` usa el mismo
  motor de diff que `codarch diff`, extraído a un módulo compartido.
- [x] **M10.4** Ver la línea del tiempo en la web y en el escritorio: el servidor expone
  `/data/history.json` y las fotos, y el escritorio lo pide por IPC.
- [x] El diff dice **cuánto** ha cambiado el código (rloc añadido, eliminado y en ficheros
  cambiados), no solo cuántos ficheros.
- [x] El MCP puede preguntar por la historia (`get_history`).

## M11 — La lente de símbolos

**Estado:** cerrado. El mapa ya sabe qué hay dentro de cada fichero: funciones, clases, interfaces y
tipos, con su complejidad. Decisión en [ADR 0025](adr/0025-lente-de-simbolos.md).

- [x] **M11.1** El parser recoge los símbolos en el mismo paseo que mide las métricas, con el
  **código compartido** con el navegador: el checksum del snapshot no cambia y la paridad
  navegador/CLI sigue valiendo ✓.
- [x] Solo los símbolos con forma (funciones, clases, interfaces, tipos, enums): las constantes son
  datos, no estructura.
- [x] La lente `symbols` en el snapshot. El `apiVersion` no cambia: una lente opcional no invalida
  el formato ✓ (como la de migración ✓).
- [x] El inspector de las dos apps lista los símbolos del fichero, de la función más compleja a la
  más simple ✓.
- [x] El MCP responde a las dos preguntas: `explain_module` da los símbolos de un fichero y
  `get_architecture_map` resume los del repo y sus funciones más complejas ✓.

## Después

Cada idea sigue aquí, con los pasos que le faltan delante. Nada se cae: lo que cambia es que ahora
se ve el camino para llegar.

### Después de los símbolos

La lente de símbolos está hecha (M11 ✓). Lo que sigue es usarla a fondo:


- **El diff de símbolos**: comparar función a función y no solo fichero a fichero. Es lo que de
  verdad interesa ("has cambiado el algoritmo de esta función") y necesita la lente de antes ✓.
- **3D**: el mapa en tres dimensiones. Antes hacen falta dos cosas: un visor que aguante el volumen
  (el nivel de detalle ya existe ✓) y un modelo de interacción (orbitar, zoom, elegir) que la web
  todavía no tiene ✓. Con esas dos cosas, el 3D es una vista más, no un producto nuevo ✓.
- **Plugins**: que terceros añadan lentes y reglas. El punto de extensión ya existe (las lentes del
  modelo ✓) y el formato es `.codarch.yml` ✓; lo que falta es decidir **qué** puede hacer un plugin
  y cómo se instala y se actualiza sin romper nada ✓.

La lente de dominio y la evolución temporal ya están hechas (M9 y M10) ✓.
