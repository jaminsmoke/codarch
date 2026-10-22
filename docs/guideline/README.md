# La guía

Esta carpeta es la **guía** de CodArch: las ideas que todavía no son fase, con su veredicto.

- `index.html` — la guía.
- `guia.css` — su estilo (los mismos colores que la app).
- `guia.js` — el índice, el «dónde estoy» y la barra de progreso.

Se abre con `npm run docs` ✓, o con doble clic en `index.html` ✓: no necesita red ✓.

## Cómo se edita

Una idea es un `<article class="entrada">` dentro de `main.contenido` ✓:

```html
<article class="entrada" id="el-nombre-de-la-idea" data-titulo="El nombre de la idea">
  <h2>
    <span class="badge badge-idea">🧪 idea</span>
    El nombre de la idea
  </h2>
  <p class="fecha">2026-10-22</p>
  ...
</article>
```

- `id` ✓: el ancla ✓. Va en kebab-case ✓ y se lee en la URL ✓.
- `data-titulo` ✓: lo que sale en el índice ✓.
- La primera línea del `h2` ✓ es el **distintivo** ✓ (el veredicto ✓) y el título ✓.

Los distintivos ✓: `badge-idea` 🧪 · `badge-fase` ✅ · `badge-arreglo` 🔧 · `badge-esperar` ⏳ ·
`badge-decision` 🧭 · `badge-propia` 🗺️ · `badge-hecho` ✅.

## La línea del tiempo

No se escribe a mano ✓: se arma sola ✓ con las entradas ✓ del documento ✓.

- La **fecha** ✓ sale del `<p class="fecha">` ✓ de la entrada ✓.
- El **color** del punto ✓ sale del distintivo ✓ de la entrada ✓.
- El **título** ✓ sale del `data-titulo` ✓ ✓.

Añadir una entrada ✓ la pone en la línea ✓; cambiar su fecha ✓ o su distintivo ✓ cambia su punto ✓.
Al pulsar un punto ✓ salta a su sección ✓, y el punto activo ✓ es el de la idea que se está leyendo ✓.

## Para añadir una idea

1. Copia un `<article class="entrada">` ✓ existente ✓ y ponlo **en su sitio cronológico** ✓ (por la
   fecha ✓).
2. Cambia el `id` ✓, el `data-titulo` ✓, la fecha ✓ y el distintivo ✓.
3. Escribe **qué es** ✓ y **por qué** ✓, lo que **falta** ✓ y el **veredicto** ⚖️.
4. Si el veredicto es "fase" ✓, la idea se mueve a la hoja de ruta de su decisión 🗺️ (ADR 0031, §7 ✓)
   y aquí queda el rastro ✓ de por qué ✓.

## Lo que no vive aquí

- Los **ADR** 🧭 y el **roadmap** 🗺️: son registros ✓ y siguen en markdown ✓, en `docs/adr/` ✓ y
  `docs/roadmap.md` ✓.
- Los nombres **G1, G2** ✓: cada entrada se llama por lo que es ✓.
