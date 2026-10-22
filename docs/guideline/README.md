# La guía

La guía de CodArch: las ideas que todavía no son fase, con su veredicto.

- `contenido.md` — **la verdad**. La web la genera (ADR 0034).

## Cómo se edita

Una idea es una sección `##` con su línea de metadatos debajo:

```markdown
## La web del proyecto
*feature · fase · 2026-10-22*

**Qué es**: ...
```

- La línea `*categoría · veredicto · fecha*`: **qué clase de trabajo es** (`feature`, `fix`,
  `docs`, `optimized`…), **qué se decidió** (`idea`, `fase`, `arreglo`, `esperar`) y **cuándo**.
  Las categorías y su orden, en el [ADR 0035](../adr/0031-0040/0035-la-guia-como-changelog.md).
- La introducción es lo que va antes de la primera sección. La leyenda, las categorías y las
  reglas son las **normas**: la web las guarda en un desplegable al final.
- Las entradas salen **en orden**: la línea del tiempo de la web las sigue.
- La web **agrupa** dos veces: por día (un nodo por fecha) y, dentro del día, por categoría
  —solo las que tienen algo—. Las que **esperan** van a **Futuro**.
- La etiqueta de cada entrada sale de su veredicto.
- El cuerpo va sin iconos decorativos: los iconos que quedan son los de la leyenda y explican
  algo. Los estados se dicen con palabras.

## Los enlaces

Los enlaces a los documentos (`../../adr/...`) se quedan en la web, en la página del documento;
lo que no es un documento (una imagen, un HTML) sale hacia el repo.
