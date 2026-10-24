---
title: ADR 0052 — Solo hacia abajo y nunca el sistema
description: "CodArch analiza y vigila únicamente la carpeta elegida y lo que cuelga de ella. Se niega con un mensaje claro ante la raíz de un volumen, las carpetas del sistema operativo y la carpeta personal entera."
section: adr
status: aceptado
date: "2026-10-24"
sidebar:
  label: Solo hacia abajo y nunca el sistema
  order: 52
---

**Estado:** aceptado · **Fecha:** 2026-10-24

## Contexto

M34 puso al escritorio a vigilar el repositorio. El estado vive anclado en la carpeta analizada
([ADR 0050](../0041-0050/0050-el-repositorio-guarda-su-estado.md)), pero hasta ahora nada impedía elegir `C:\Windows`, `/usr` o la carpeta personal entera:
el análisis y la vigilancia habrían recorrido lo que hubiera. Tampoco había una regla escrita sobre
hacia dónde se mira.

## Decisión

### 1. La carpeta elegida es el techo

CodArch mira **solo hacia abajo** desde la carpeta que se abre: analiza lo que cuelga de ella y
vigila esa misma raíz. No busca `.codarch/` ni `.codarch.yml` en carpetas superiores y no deduce una
raíz «más limpia» por su cuenta.

### 2. Lo que no se analiza

Se rechaza, con un mensaje que lo dice:

- la **raíz de un volumen** (`C:\`, `/`);
- las **carpetas del sistema** del sistema operativo:
  - Windows: `Windows`, `Program Files`, `Program Files (x86)`, `ProgramData`, `PerfLogs`,
    `Recovery`, `System Volume Information` y la papelera;
  - Linux: `/bin`, `/boot`, `/dev`, `/etc`, `/lib`, `/lib64`, `/proc`, `/root`, `/run`, `/sbin`,
    `/sys`, `/usr` y `/var`;
  - macOS, cuando se publique: además `/System`, `/Library`, `/private` y `/Applications`;
- la **carpeta personal entera** del usuario (sus proyectos sí).

La comprobación se hace en el CLI (`analyze` y `serve`) y en el escritorio (analizar, restaurar,
abrir con el sistema y antes de vigilar). En el CLI sale con código 1 y el motivo; en el escritorio,
el error se enseña en el mapa.

### 3. La ruta real solo decide, no cambia nada

Para decidir, la comprobación resuelve la ruta real: así un enlace que apunta al sistema no se cuela.
La raíz que se analiza y la que se vigila siguen siendo exactamente la que eligió el usuario: no se
normalizan ni se reescriben.

### 4. Los enlaces no se siguen

El recorrido no sigue enlaces simbólicos, así que un repositorio no puede arrastrar al sistema por un
enlace dentro de él. La comprobación de la raíz cubre el caso de que la carpeta elegida sea en sí un
enlace a una ruta protegida.

## Consecuencias

- Elegir una carpeta del sistema falla en el acto, sin recorrerla ni vigilarla.
- Analizar `repo/src` sigue siendo un análisis de `src/`, no del repo entero.
- Los proyectos normales, en cualquier volumen, no notan nada.
- La lista es del producto, no configurable desde el repo: un `.codarch.yml` no puede pedir analizar
  `C:\Windows`.

## Alternativas descartadas

- **Buscar la raíz «verdadera» hacia arriba** (por `.git` o `.codarch.yml`): cómodo, pero convierte
  un análisis de `src/` en uno del repo entero y pisa el estado del repo (ADR 0050).
- **Solo avisar y dejar seguir**: un análisis de `C:\Windows` no es un caso de uso, es un accidente.
- **Lista configurable por repo**: la seguridad del equipo no la decide un fichero que viene con el
  repositorio.

## Hoja de ruta

Sin fases abiertas: es una guarda de seguridad.

### Ideas abiertas

- Decir en la interfaz qué carpeta se está viendo cuando se analiza una subcarpeta (M34).
- Revisar la lista si algún sistema operativo añade carpetas protegidas nuevas.
