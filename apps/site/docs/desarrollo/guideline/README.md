# La guía

La guía de CodArch: las ideas que todavía no son fase, con su veredicto.

- `normas.md` — la leyenda, las categorías, los veredictos y las reglas.
- `entradas/` — **la verdad**: una idea por fichero (ADR 0046).

## Cómo se edita

Una idea es un `.md` en `entradas/` con este nombre y este frontmatter:

```markdown
---
title: La web del proyecto
date: "2026-10-22"
category: feature
verdict: fase
---

**Qué es**: ...
```

- **El nombre** (`AAAA-MM-DD-NN-titulo.md`) fija el día y el orden: el `NN` ordena las entradas del
  mismo día. El título, en kebab-case, da el ancla.
- **`category`** es una de las del changelog de la guía: `feature`, `fix`, `optimized`, `refactor`,
  `docs`, `chore`, `security` o `removed`. El orden y su color, en el
  [ADR 0035](../adr/0031-0040/0035-la-guia-como-changelog.md).
- **`verdict`** es `idea`, `fase`, `adr`, `arreglo` o `esperar`.
- **La fecha** va entre comillas: es un dato, no una fecha de YAML.
- **El cuerpo** va sin iconos decorativos. Los estados se dicen con palabras.

La web la genera en el build (ADR 0046): añadir el fichero basta, sin tocar código. Agrupa por día
y, dentro del día, por categoría; las que **esperan** van a **Futuro**.

## Los enlaces

Los enlaces a los documentos (`../../adr/...`) se quedan en la web, en la página del documento; lo
que no es un documento (una imagen, un HTML) sale hacia el repo.
