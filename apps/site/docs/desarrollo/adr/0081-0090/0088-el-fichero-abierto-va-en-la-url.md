---
title: "ADR 0088 — El fichero abierto va en la URL"
description: "El fichero que ocupa el escenario se escribe en la URL con la clave code, que lleva su ruta: el enlace abre el código directamente y se quita al volver al mapa. Enmienda el punto 4 del ADR 0087."
section: desarrollo
status: aceptado
date: "2026-10-27"
sidebar:
  label: El fichero abierto va en la URL
  order: 88
---

**Estado:** aceptado · **Fecha:** 2026-10-27

## Contexto

El [ADR 0087](0087-el-fichero-entero-en-el-escenario.md) abrió el fichero entero en el escenario y
dejó su estado **fuera** de la URL: abrir código era un gesto de la vista, no un sitio. La duda
quedó escrita en su hoja de ruta: un enlace así depende de que la plataforma pueda leer el fichero,
y en la demo no hay ficheros que leer.

Hoy las tres plataformas que analizan leen el fichero entero: el servidor local por
`/api/source?whole=1`, el escritorio por IPC y la web que analizó una carpeta, desde los ficheros que
leyó el análisis ([ADR 0067](../0061-0070/0067-la-ficha-ensena-el-codigo.md)). Lo único que no lee es
la demo estática, que no tiene snapshot de un repo.

Al mismo tiempo, el enlace de la vista ya se comparte —se copia desde **ABRIR REPOSITORIO O ARCHIVO**
y se pega en un ticket— con `area`, `color`, `focus`, `file`, `tab`, `symbol` y `labels`
([ADR 0018](0011-0020/0018-estado-vista-en-la-url.md)). Decir «mira este fichero» seguía pidiendo
que el otro entrara, lo encontrara en el mapa y hiciera doble clic.

## Decisión

1. **Clave `code`, con la ruta.** `?file=packages/ui/src/useCodarchApp.tsx&tab=file&code=packages/ui/src/useCodarchApp.tsx`
   abre el mapa con ese fichero en el escenario. Es una clave más del dialecto de la vista y vale
   igual para la web servida que para un snapshot por `src`.
2. **`code` manda sobre `file`.** El valor lleva la ruta, así que un enlace escrito a mano puede
   decir solo `?code=…`: se selecciona ese fichero y se abre. Si las dos claves discrepan, gana
   `code`, que es la que se ve.
3. **Se escribe al abrir y se quita al cerrar.** Doble clic, ruta, `Esc` y **← Mapa** dejan la URL en
   un estado o en el otro. Se escribe con `replaceState`, como el resto del estado de vista: abrir
   código no añade una entrada al historial del navegador; para volver están la ruta, `Esc` y el
   botón.
4. **Se restaura solo si el fichero existe en el snapshot.** Un `code` que apunta a una ruta que ya no
   está se ignora en silencio, como el resto del estado de vista: es una pista, no un contrato.
5. **Si la plataforma no puede leerlo, se dice.** En la demo estática el escenario enseña el aviso de
   que no se pudo leer y el **← Mapa** para salir; no se cae al mapa en silencio, que dejaría al
   lector sin saber por qué el enlace no abre lo que prometía.
6. **Las vistas guardadas de un addon no lo llevan.** `AddonViewState` tiene una lista cerrada de
   claves y aquí no se amplía: una vista guardada sigue siendo el mapa con su lente, su carpeta y su
   ficha.

## Consecuencias

- Un enlace ya sirve para señalar un fichero, y el mismo enlace sigue describiendo el mapa: `focus`,
  `color` y `area` no cambian.
- La URL gana una clave larga cuando hay un fichero abierto; el resto del tiempo no aparece.
- El escritorio no cambia: no tiene URL. Allí abrir y cerrar código siguen siendo el doble clic, la
  ruta, `Esc` y el botón.
- El estado de la vista se lee una sola vez al arrancar, así que cargar otro snapshot sigue cerrando
  el fichero ([ADR 0087](0087-el-fichero-entero-en-el-escenario.md)).

## Alternativas descartadas

- **`view=code` junto a `file`.** Son dos claves que tienen que concordar, y una puede llegar sin la
  otra: `code` lleva su ruta y no puede desmentirse.
- **El índice del fichero.** Es corto y no se lee; deja de valer en cuanto el snapshot cambia de
  orden.
- **Un `#code=…` en el hash.** El hash es de las anclas del documento y del enrutado del sitio: se
  pisarían.
- **Meter el código en el enlace.** No cabe y el fichero cambia sin que el enlace lo sepa.

## Hoja de ruta

### El fichero abierto, en el enlace

- [x] La clave `code` se lee y se escribe con el resto del estado de vista.
- [x] El enlace abre el fichero del escenario si está en el snapshot; si no, se ignora.
- [x] Cerrar el código quita la clave, y la demo avisa cuando no puede leer el fichero.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
