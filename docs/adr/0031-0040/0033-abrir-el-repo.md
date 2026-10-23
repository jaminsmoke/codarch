---
title: "ADR 0033 — Abrir el repo: lo que hay que tener antes"
description: "Lo único que sigue privado ✓ es el código fuente ✓ y los documentos ✓. Y el plan de la guía —el registro público de plugins ✓— necesita que el repo sea público ✓: nadie…"
section: adr
status: aceptado
date: "2026-10-22"
sidebar:
  label: "Abrir el repo: lo que hay que tener antes"
  order: 33
---

**Estado:** aceptado · **Fecha:** 2026-10-22

## Contexto

El código de CodArch **ya sale del repo** ✓:

- El CLI está publicado en npm ✓ como `codarch` ✓ (0.2.0 ✓), con su binario ✓ y su código
  empaquetado ✓.
- La GitHub Action vive en un repo **público** ✓ (`jaminsmoke/codarch-action` ✓), que se genera
  desde aquí ✓ con `npm run sync:action` ✓.

Lo único que sigue privado ✓ es el **código fuente** ✓ y los **documentos** ✓. Y el plan de la guía
—el **registro público de plugins** ✓— necesita que el repo sea público ✓: nadie publica un
plugin en un repo que no puede ver ✓.

La pregunta no es «¿abrimos el repo?» ✓ sino «¿qué tiene que estar en su sitio antes?» ✓, porque
abrir un repo es fácil ✓ y cerrarlo después, con la historia y las releases, no ✓.

## La auditoría (hecha, 2026-10-22)

Lo que **ya está**:

| Comprobación | Estado |
|---|---|
| Licencia | **MIT** ✓, en el `LICENSE` ✓ y declarada en el paquete de npm ✓ |
| Secretos en el árbol | **ninguno** ✓ |
| Secretos en la historia | **ninguno** ✓ (124 commits ✓) |
| Licencias de las dependencias | **todas permisivas** ✓ (MIT ✓ e ISC ✓): no hay copyleft ✓ que cumplir ✓ |
| Datos personales | uno solo ✓: el correo del mantenedor ✓ en `electron-builder.yml` ✓ (es público en cualquier proyecto ✓) |
| `.gitignore` | cubre `node_modules` ✓, `dist` ✓, `.codarch` ✓, `samples` ✓ y `coverage` ✓ |
| Ramas | dos ✓: `main` ✓ y `chore/dogfood-architecture-rules` ✓ |

Lo que **falta**:

| Comprobación | Qué hacer |
|---|---|
| Aviso de marca | la licencia MIT **no** concede la marca ✓: hace falta un aviso ✓ de que «CodArch» ✓ y el logotipo ✓ no se conceden ✓ |
| `SECURITY.md` | cómo se avisa de un fallo de seguridad ✓ y qué se espera ✓ |
| `CONTRIBUTING.md` | cómo se contribuye ✓ (commits convencionales ✓, una idea por commit ✓) |
| `NOTICE.md` | los créditos ✓: CodeCharta ✓ (clean-room ✓, ADR 0001 ✓), tree-sitter ✓, las tipografías ✓ |
| Privacidad | decir que la app **no recoge nada** ✓ y que lo único que sale a la red ✓ es la comprobación de actualizaciones ✓ (npm ✓ y GitHub ✓) |
| Nombre | comprobar que «CodArch» ✓ está libre donde importa ✓ (npm ✓ ya es nuestro ✓; el dominio ✓ y la marca ✓, por decidir ✓) |
| El repo público de la acción | sus enlaces apuntan a documentos **privados** ✓: hoy son enlaces rotos ✓ para quien no tenga acceso ✓ |

## Decisión

### 1. La licencia se queda en MIT

MIT ✓ es lo que ya hay ✓ y lo que ya viaja en npm ✓. No se cambia a copyleft ✓: obligaría a quien
use la herramienta a abrir su código ✓, y para una herramienta de análisis ✓ eso no aporta nada ✓
que no aporte el código abierto ✓ en sí.

### 2. La marca no se concede con la licencia

Un aviso de marca ✓ (en el `LICENSE` ✓ y en un `TRADEMARK.md` ✓): la licencia concede el código ✓,
no el nombre «CodArch» ✓ ni el logotipo ✓. Así se puede usar el código ✓ sin que nadie herede la
marca ✓.

### 3. Las medidas se toman **antes** de abrir, y son inofensivas mientras el repo es privado

Todo lo de la tabla de arriba ✓ se puede escribir y revisar con el repo todavía privado ✓:

- `SECURITY.md` ✓, `CONTRIBUTING.md` ✓, `NOTICE.md` ✓, `TRADEMARK.md` ✓ y la nota de privacidad ✓
  en el README ✓.
- La nota de privacidad ✓: la app no manda el código a ninguna parte ✓; lo único que sale a la red
  ✓ es la comprobación de actualizaciones ✓.

### 4. El orden: primero las medidas, luego el ensayo, luego la puerta

1. **Las medidas** ✓ de arriba ✓, revisadas ✓.
2. **La revisión final** ✓: qué ramas quedan ✓ (`chore/dogfood-architecture-rules` ✓: fusionar o
   borrar ✓, decidir antes de abrir ✓), qué hay en la historia ✓ (revisada ✓: nada ✓), y el repo
   público de la acción ✓, cuyos enlaces hay que arreglar ✓ (o apuntar a npm ✓ mientras el repo sea
   privado ✓).
3. **El ensayo** ✓: abrir el repo en público ✓ y mirar ✓ que no sale nada que no deba ✓ (los
   artefactos ✓, los datos ✓, la historia ✓).
4. **La puerta** ✓: si el ensayo sale bien ✓, se deja público ✓ y se anuncia ✓ (el README ✓, la
   release ✓, el paquete de npm ✓, que ya apunta al repo ✓).

### 5. Lo que no se hace

- **No se publica el repositorio entero de golpe** ✓ sin las medidas ✓: un repo público sin
  `SECURITY.md` ✓ ni aviso de marca ✓ es una invitación a que alguien lo use y se queje ✓.
- **No se cambia la licencia** ✓ a mitad de camino ✓.
- **No se borra la historia** ✓: 124 commits ✓ limpios ✓ no justifican reescribir nada ✓, y reescribir
  la historia rompe las referencias ✓.

### 6. El nombre, antes de que sea tarde

«CodArch» ✓ ya está en npm ✓ (nuestro ✓). Antes de que el repo sea público ✓ conviene comprobar
✓ que el nombre ✓ está libre ✓ en el dominio ✓ y en la marca ✓, y decidir ✓ si se registra ✓.
Registrar la marca **después** de abrir ✓ y no antes ✓: se registra lo que ya se usa ✓, no lo que
se proyecta ✓.

## Consecuencias

- El repo público ✓ es el primer sitio donde alguien puede leer ✓ el ADR 0001 ✓ (el clean-room ✓) ✓
  y ver de dónde sale cada decisión ✓.
- La **guía** ✓ se vuelve pública ✓: las ideas ✓ quedan a la vista ✓, que es justo lo que un
  registro de plugins necesita ✓.
- El paquete de npm ✓ ya apunta al repo ✓: al abrirlo ✓, esos enlaces empiezan a funcionar ✓.
- El repo público de la acción ✓ deja de tener enlaces rotos ✓.
- Con el repo público ✓ se puede **registrar** el proyecto ✓: el registro de plugins ✓ (la idea G1 ✓
  de la guía ✓) y el nombre ✓.

## Alternativas descartadas

- **Publicar tal cual, sin más** ✗: la licencia ✓ sin aviso de marca ✓, sin `SECURITY.md` ✓ y con el
  action apuntando a documentos privados ✗ es pedir problemas ✓.
- **No abrir nunca** ✗: el código ya sale en npm ✓ y en el action ✓; esconderse no protege el
  trabajo ✓ y cierra la puerta a los terceros ✓ que el producto quiere ✓.
- **AGPL** ✗: obliga a abrir lo de quien use la herramienta ✓, sin ganar nada ✗ que el código
  abierto ✓ en sí no da ✓.
- **Borrar la historia antes de abrir** ✗: está limpia ✓ (revisada ✓) y reescribirla rompe las
  referencias ✓ y no protege nada ✓.

## Hoja de ruta

Sin fases abiertas: M22 está cerrada.

### Ideas abiertas

- [La guía: el registro público de plugins](../../guideline/contenido.md#el-registro-publico-de-plugins)
  el registro necesita que el repo sea público.

El detalle de lo hecho está en el [changelog](0033-abrir-el-repo.changelog.md).

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.

Esto no es consejo legal ✓: la marca ✓ y la licencia ✓ son decisiones de alguien que las entienda ✓
—un abogado ✓ si de verdad se va a registrar el nombre ✓—; el resto ✓ es preparación ✓.
