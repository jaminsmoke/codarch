# ADR 0031 — Los documentos: cada decisión con su hoja de ruta

**Estado:** aceptado · **Fecha:** 2026-10-22

## Contexto

Los documentos del repo han crecido sin un plan ✓: treinta ADR ✓ en una carpeta plana ✓, un
`roadmap.md` ✓ de casi 400 líneas ✓ con 18 fases ✓ mezcladas ✓, y una `guideline.md` ✓ con ideas ✓
junto a arreglos ✓.

Tres cosas molestan ✓:

1. **Un ADR no tiene sitio para su propio trabajo** ✓. Cuando una decisión crece ✓ —se amplía ✓, se
   matiza ✓, le sale una fase ✓— el sitio natural es su hoja de ruta ✓, y hoy no existe ✓: el trabajo
   se cuela en el roadmap central ✓ o en la guía ✓, y los dos son de todos ✓.
2. **El roadmap central mezcla decisiones** ✓. M5 ✓ depende de tres ADR ✓ (el servidor local ✓, el
   estado en la URL ✓, el nivel de detalle ✓) y no se sabe qué parte de la fase es de cuál ✓.
   Además, ampliar un ADR significa tocar un fichero que también habla de otros ✓.
3. **La guía no está en orden** ✓: sus ideas van por número de sección ✓, no por momento ✓, así que
   insertar una idea en medio obliga a renumerar ✓, y quitar una deja huecos ✓.

## Decisión

### 1. Los ADR van en carpetas de diez

```
docs/adr/
  index.md                              ← el índice: número, título, fecha, estado, fases
  0001-0010/
    0001-clean-room-con-ccjson.md
    0001-clean-room-con-ccjson.roadmap.md
    ...
  0011-0020/
  0021-0030/
  0031-0040/
```

Cada bloque de diez ✓ agrupa por época ✓, no por tema ✓: el número ya dice cuándo se decidió ✓, y el
índice ✓ dice de qué va cada una ✓.

### 2. Cada ADR lleva su hoja de ruta al lado

`<adr>.roadmap.md` ✓, con las **fases de esa decisión** ✓ y su detalle ✓. Si la decisión crece ✓, su
hoja crece con ella ✓ y el roadmap central no se entera ✓. Las decisiones que no tienen fase propia
dicen **dónde se aplican** ✓.

### 3. El roadmap central es un índice

`docs/roadmap.md` ✓ pasa a ser el **índice** de las fases ✓: una línea por fase ✓ (número ✓, qué ✓,
estado ✓, decisión ✓). El detalle vive en la hoja de la decisión que la trae ✓.

### 4. Cada fase tiene una decisión dueña

Una fase pertenece a **una** decisión ✓ —la que la trae ✓— y puede citar otras ✓. El detalle de la
fase vive en la hoja de la dueña ✓; las demás la enlazan ✓. Así se sabe de quién es cada parte ✓.

### 5. La guía es un registro cronológico

Cada idea tiene **fecha** ✓ e **identificador estable** ✓ (`G1` ✓, `G2` ✓…): el identificador no
cambia ✓ aunque la idea se mueva de sitio ✓ o se inserte otra en medio ✓. El registro va por orden
cronológico ✓, no por número de sección ✓.

## Consecuencias

- Los treinta ADR se mueven ✓ a su carpeta ✓ y sus enlaces se reescriben ✓: en el repo ✓, en los
  README ✓ y en las URLs públicas ✓.
- `docs/adr/index.md` ✓ es el índice de las decisiones ✓: número ✓, título ✓, fecha ✓, estado ✓ y
  fases ✓.
- La guía ✓ gana identificadores ✓ y orden ✓; las ideas que ya eran fase ✓ conservan su rastro ✓.
- `AGENTS.md` ✓ y el README ✓ se actualizan ✓.
- Los enlaces profundos cambian ✓: quien tenga una URL de un ADR ✓ tiene que volver a construirla ✓.
  Los antiguos rompen ✓; no hay forma de no romperlos ✓ sin dejar redirectiones ✓ que no valen para un
  repo privado ✓.

## Alternativas descartadas

- **Una carpeta por ADR** (`docs/adr/0025-.../adr.md` ✓): se lee mejor ✓, pero mete cuatro niveles ✓
  y los enlaces relativos se vuelven frágiles ✓ (`../../../../` ✓). Con carpetas de diez ✓, dos niveles
  bastan ✓.
- **Un roadmap por fase** (`docs/roadmap/M11.md` ✓): separa el detalle de la decisión que lo trae ✓,
  que es justo lo que se quiere evitar ✓.
- **Dejar la guía numerada** ✓: no se puede insertar una idea en medio ✓ sin renumerar ✓.

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
