# ADR 0030 — Instalar y quitar: plugins y addons

**Estado:** aceptado · **Fecha:** 2026-10-22

## Contexto

M14 y M15 dejaron los **plugins** ✓ (ADR 0028 ✓) y M16 los **addons** ✓ (ADR 0029 ✓). Los dos viven
igual ✓:

```
plugins/<nombre>/     plugin.json + index.tsx    código: se compila
addons/<nombre>/      addon.json + yml           datos: se lee
```

Y los dos se declaran en `.codarch.yml` ✓ (`plugins:` ✓, `addons:` ✓), que es lo que leen el build ✓,
el CLI ✓, las dos apps ✓, la acción ✓ y el MCP ✓.

Pero solo uno sabe instalarse y quitarse ✓. `codarch addons list|add|remove` existe ✓; los plugins no
tienen comando ✗: quitar uno es borrar `plugins/<nombre>/` a mano y editar el YAML ✗, y es fácil
dejarlo a medias ✓:

- **Carpeta sin declaración** ✓: el plugin no entra en el build ✓ y nadie se entera ✗ (pesa en el repo ✓).
- **Declaración sin carpeta** ✓: el manifiesto no se encuentra ✓ y el plugin desaparece del store sin
  decir nada ✗.

Además el vocabulario mezcla dos cosas distintas ✓: **instalar** ✓ (el repo lo tiene ✓) y **activar**
✓ (esta máquina lo usa ✓). Solo los plugins tienen lo segundo ✓ (ADR 0027 ✓); los addons no se activan
nunca ✗ (ADR 0029 ✓: los ajustes solo los miran ✓).

La pregunta es: **¿cómo se instala y se quita una extensión, y dónde está la lista de las
instaladas?**

## Decisión

### 1. Dos verbos: instalar y quitar; activar es otra cosa

| | instalar | quitar | activar |
|---|---|---|---|
| **plugin** | carpeta ✓ + `plugins:` ✓ | borrar `plugins/<n>/` ✓ + `plugins:` ✓ | sí ✓, por máquina ✓ (los ajustes ✓) |
| **addon** | carpeta ✓ + `addons:` ✓ | borrar `addons/<n>/` ✓ + `addons:` ✓ | no ✗: viaja con el repo ✓ |

Instalar y quitar son **del repo** ✓; activar es **de la máquina** ✓ y solo existe en plugins ✓.

### 2. Un solo manifiesto: `.codarch.yml`

No hay `plugins/manifest.json` ✗ ni `addons/manifest.json` ✗. La lista de instalados es la que ya
existe ✓, por tres razones ✓:

- **Ya la leen todos** ✓: el build ✓, el CLI ✓, las apps ✓, la acción ✓ y el MCP ✓. Un segundo fichero
  sería una segunda verdad ✓ que se desincroniza ✗.
- **El orden de `addons:` es semántico** ✓: el que va después gana en la fusión ✓ (ADR 0029 ✓). La lista
  no es solo contabilidad de instalación ✓.
- **Las capas y las reglas ya viven ahí** ✓: el addon se declara al lado de lo que modifica ✓.

La carpeta sigue declarando **qué es** ✓ (`plugin.json` ✓, `addon.json` ✓); el YAML decide **qué se
compila** ✓ y **qué se aplica** ✓.

### 3. Quitar es borrar la carpeta hija

```
plugins/            se queda ✓
  vista-3d/         se queda ✓
  ejemplo/          se borra ✓
addons/             se queda ✓
```

Nunca se borra la carpeta contenedora ✗, ni `.codarch/` ✗, ni el snapshot ✗. El nombre se valida con
el mismo guardia que los addons ✓ (`^[a-z0-9][a-z0-9-]*$` ✓): vacío ✗, `..` ✗ o una ruta absoluta ✗
es un error ✓, no una carpeta que borrar ✗.

### 4. Comandos simétricos

```bash
codarch plugins list            # instalados, declarados y qué no cuadra
codarch plugins add ./mi-vista  # valida plugin.json, copia la carpeta y la declara
codarch plugins remove mi-vista # la borra y la quita de la declaración

codarch addons  list
codarch addons  add ./nestjs
codarch addons  remove nestjs
```

`add` valida el manifiesto **antes** de copiar ✓ (`name` ✓, `version` ✓, `contributes` ✓) y que exista
el punto de entrada ✓ (`index.tsx` o `index.ts` ✓); si ya está instalado ✓, error claro ✓ y cómo
salir ✓. `remove` falla con un mensaje claro si la carpeta no está ✓, sin tocar el YAML ✓.

### 5. La lista avisa cuando no cuadra

`list` compara lo declarado con lo que hay en la carpeta ✓:

```
plugins/
  vista-3d   instalado
  ejemplo    en la carpeta pero sin declarar: no entra en el build
  roto       declarado pero falta la carpeta
```

No se arregla solo ✗: quitar o declarar es una decisión del repo ✓, y un comando que borra por su
cuenta es justo lo que no se quiere ✗. `--json` para el CI ✓.

### 6. Qué significa instalar en cada caso

- Un **plugin** se instala en el **build de CodArch** ✓ (o en un fork ✓): su carpeta es fuente que se
  compila junto a la app ✓. No se instala en el proyecto que analizas ✗.
- Un **addon** se instala en el **proyecto que analizas** ✓ y viaja con él ✓.

La documentación lo dice con esas palabras ✓: es la diferencia que más se confunde ✓.

## Consecuencias

- El CLI gana `plugins` con `list|add|remove` ✓ y `--json` ✓; el de addons se queda ✓, con los mismos
  mensajes ✓.
- El build no cambia ✓: sigue leyendo `plugins:` de `.codarch.yml` ✓ (`compiledPlugins` ✓). El guardia
  de nombre se aplica también al leer la declaración ✓.
- Los ajustes siguen igual ✓: los plugins se activan por máquina ✓ (ADR 0027 ✓), los addons se miran ✓
  (ADR 0029 ✓). Cambia el texto ✓, no el comportamiento ✓: **instalado** no es **activado** ✓.
- Los ejemplos del repo ✓ (`plugins/ejemplo` ✓, `addons/ejemplo` ✓) se quitan con los comandos nuevos ✓,
  y el README ✓, `AGENTS.md` ✓ y los ADR que los citan se actualizan ✓. La prueba del contrato queda
  en los tests ✓ y en la documentación ✓, no en el repo de CodArch ✓.
- Quitar el addon de ejemplo deja `addons: []` ✓ en el `.codarch.yml` de este repo ✓: el menú
  «Vistas» se queda sin vistas guardadas ✓, que es lo normal en un repo que no instala addons ✓.

## Alternativas descartadas

- **Un manifiesto dentro de `plugins/` y `addons/`.** Descartado ✓: `plugins:` y `addons:` ya existen ✓
  y los leen todas las piezas ✓; dos listas se desincronizan ✗, hay que migrar lo que ya está ✗, y el
  orden de `addons:` dejaría de ser el que decide la precedencia ✗.
- **Instalar = que exista la carpeta, sin lista.** Descartado ✓: todo plugin de `plugins/` entraría en
  el bundle ✗ (three.js son 600 KB ✗) y el orden de los addons se perdería ✗.
- **Que `list` arregle la desincronización.** Descartado ✓: borrar carpetas solo porque falta una línea
  es sorprendente ✗; avisar ✓ y dejar decidir ✓ es más barato ✓.
- **Un registro o descarga desde una URL.** Fuera de alcance ✓: instalar es copiar una carpeta ✓;
  distribuir tiene su propia decisión ✓ (la guía, §1 ✓).

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
