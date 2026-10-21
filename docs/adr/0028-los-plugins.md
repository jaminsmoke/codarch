# ADR 0028 — Los plugins: piezas del repo que se activan

**Estado:** aceptado · **Fecha:** 2026-10-21

## Contexto

El producto va a crecer en direcciones que no conocemos todavía. La primera de ellas es la **vista
3D** ✓: un mapa en tres dimensiones que comparte modelo ✓ pero que tiene su propio render ✓, sus
propias interacciones ✓ y su propio rendimiento ✓.

Si la vista 3D vive dentro de `apps/web` ✓, la app queda con un mapa que la mitad del tiempo no
muestran ✓ y con unrenderer que nadie va a mantener ✓. Si vive aparte ✓ — como un plugin ✓ — se
puede **activar y desactivar** ✓, y el resto de plugins que vengan detrás tienen un sitio donde
vivir ✓.

La pregunta es **qué es un plugin** y **cómo se extiende el programa**.

Lo que **no** va a ser:

- **Un paquete de npm.** Un plugin puede tocar el frontend ✓ (una pestaña nueva ✓, un panel ✓) y el
  bundle de una web estática no puede cargarlo en caliente ✗. Además, un plugin no es una
  dependencia: es una pieza del producto ✓, con su versión ✓ y su evolución ✓.
- **Un plugin con un runtime propio.** El motor es el de CodArch ✓; un plugin usa sus APIs ✓.

## Decisión

### 1. Viven en el repo, en `plugins/`

```
plugins/
  vista-3d/
    plugin.json      ← el manifiesto
    index.ts         ← el punto de entrada
    view.tsx
    styles.css
    README.md
```

Cada plugin en su carpeta ✓, con su estructura dentro ✓. Es código del repo ✓: entra por PR ✓, tiene
tests ✓ y se revisa ✓.

### 2. El manifiesto va con el plugin: `plugin.json`

**No** en el `package.json` ✓: un plugin puede vivir en un repo sin publicar nada ✓ y no tiene por qué
parecerse a un paquete npm ✓. **No** en un `plugins.json` único en la raíz ✓: ese archivo tendría
que repetir el nombre y la versión de cada plugin ✓, y la duplicación se desincroniza ✓. El manifiesto
va **junto al código** ✓, que es donde está la verdad ✓.

```json
{
  "name": "vista-3d",
  "version": "0.1.0",
  "title": "Vista 3D",
  "description": "El mapa en tres dimensiones.",
  "icon": "cube",
  "contributes": { "views": ["mapa"] },
  "requires": { "webgl2": true, "gpu": true }
}
```

- **`contributes`**: qué aporta ✓. Hoy, una vista ✓ (una pestaña del mapa central ✓). Lo que se pueda
  añadir sin romper el contrato ✓.
- **`requires`**: qué necesita ✓. El 3D pide WebGL2 ✓ y GPU ✓: la app lo comprueba y lo dice ✓ en
  vez de fallar a medias ✓.

### 3. Dos niveles: compilado y activado

El código no puede desaparecer en caliente ✓ (la web es un bundle estático ✓), así que hay dos
decisiones distintas ✓:

| | quién decide | cuándo |
|---|---|---|
| **compilado** | el repo (`.codarch.yml`: `plugins: [vista-3d]`) ✓ | al construir ✓ |
| **activado** | el usuario ✓, en el store de los ajustes ✓ | en caliente ✓ |

Lo que no está compilado **no entra en el bundle** ✓ (si no, three.js serían 600 KB aunque nadie abra
la vista 3D ✓). Lo que está compilado pero no está activado ✓ se carga **bajo demanda** ✓, la
primera vez que se usa ✓.

### 4. El store es local

El estado de activación vive **en la máquina del usuario** ✓ (la web: `localStorage` ✓; el
escritorio: su almacén de usuario ✓). El repo declara **qué plugins existen** ✓; cada quien activa
los que quiere ✓.

Cambiar un plugin no puede cambiar el análisis ✓: el checksum del snapshot depende del código ✓, no
de qué tienes instalado ✓. Un plugin que añada **lentes al modelo** sí cambiaría el checksum ✓ →
eso **no se permite al principio** ✓ (ADR 0026 ✓). Los plugins aportan **reglas** ✓ (que no tocan el
snapshot ✓) y **vistas** ✓ (que no lo tocan ✓). Añadir lentes al modelo es una fase aparte ✓, con
su propia decisión ✓.

### 5. La API: un contexto, no un globale

Un plugin recibe un **contexto** ✓ con lo que puede hacer ✓:

```ts
interface PluginContext {
  model: RenderModel | null;        // el mapa que se está viendo
  selection: string | null;         // el fichero elegido
  actions: { select(path), focus(path), setTab(tab) };
  preferences: ViewPreferences;
  url: { read(), write(state) };
  storage: Storage | null;
}
```

Y **contribuye** con piezas concretas ✓: una vista (una pestaña del mapa central ✓), un panel de la
barra lateral ✓, un modo de color ✓.

El riesgo de esto es que **la app se convierta en un nido de plugins** ✗. Por eso el contrato es
**pequeño y explícito** ✓: la vista 3D es la prueba ✓ (necesita el modelo ✓, la selección ✓, una
pestaña ✓ e interacción ✓). Si el contrato cubre la vista 3D con holgura ✓, el resto de plugins son
fáciles ✓.

### 6. La vista 3D es el primer plugin

Es la prueba de que el sistema sirve ✓: una pestaña nueva ✓ que cambia **solo** el mapa central ✓ (las
barras laterales siguen igual ✓, con los mismos datos ✓), con three.js ✓ cargado bajo demanda ✓.

## Consecuencias

- El repo tiene una carpeta `plugins/` ✓ que es código de producto ✓ y que se revisa como tal ✓.
- La app no sabe qué es un plugin ✓: solo conoce el contexto ✓ y lo que se puede contribuir ✓. Los
  plugins se descubren en el build ✓ (un `import.meta.glob` ✓ sobre `plugins/*/index.ts` ✓).
- El store de los ajustes (ADR 0027 ✓) es donde se activan ✓: es **local** ✓ y no toca el análisis ✓.
- Un plugin puede vivir sin publicarse ✓, pero **no se puede instalar fuera del repo** ✓: no hay
  registro ✓ todavía ✓ (una fase posterior ✓, con firma ✓).

## Alternativas descartadas

- **Plugins como paquetes de npm.** Descartado: no pueden tocar el frontend ✓ de una web estática ✓.
- **Un `plugins.json` único en la raíz.** Descartado: duplica el nombre y la versión de cada
  plugin ✓, y desincroniza ✓.
- **El manifiesto dentro del `package.json`.** Descartado: un plugin no es un paquete ✓ y no tiene por
  qué llevar metadatos de npm ✓.
- **Instalar plugins de verdad (copiar código en caliente).** Descartado por ahora: en la web no se
  puede ✓, y en el escritorio obligaría a recompilar ✓. Activar es lo que se puede hacer bien ✓.
- **Que un plugin añada lentes al modelo.** Descartado **al principio**: cambiaría el checksum del
  snapshot ✓ según lo que tengas instalado ✓, y el análisis dejaría de ser reproducible ✓.

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
