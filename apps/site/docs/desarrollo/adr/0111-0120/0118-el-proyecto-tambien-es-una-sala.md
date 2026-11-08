---
title: "ADR 0118 — El proyecto también es una sala"
description: "El primer nivel deja de ser un overview plano: el proyecto abre la primera sala y todas las escalas comparten suelo, paredes, techo, viga y letrero. El frente queda abierto."
section: desarrollo
status: aceptado
date: "2026-11-08"
sidebar:
  label: El proyecto también es una sala
  order: 118
---

**Estado:** aceptado · **Fecha:** 2026-11-08

**Enmienda** el [ADR 0117](0117-salas-recursivas-y-estanterias.md): el overview plano del primer
nivel desaparece y se convierte en la sala del proyecto.

## Contexto

El ADR 0117 dejó el primer nivel como un mapa plano y reservó las salas para las carpetas. La
divergencia se notaba en todo: el proyecto no tenía paredes ni techo, los ficheros de la raíz vivían
en una estantería distinta, la cámara encuadraba de otra manera y las etiquetas no tenían el mismo
punto de referencia.

También faltaba una pieza de lectura: al entrar en una sala no había un nombre visible que dijera
dónde estamos. El breadcrumb lo dice, pero no forma parte del espacio.

## Decisión

### 1. El proyecto es la primera sala

No hay un overview especial. El proyecto se construye con la misma `buildRoom` que una carpeta:

- los contenedores del primer nivel son sus archivadores;
- los ficheros de la raíz van a su estantería;
- pulsar un archivador abre la sala de esa carpeta;
- la regla se repite hasta el fondo del árbol.

Una sola geometría, una sola cámara y una sola forma de leer. El foco `null` ya no significa “mapa
plano”: significa “sala del proyecto”.

### 2. La viga es el único cierre frontal

La sala mantiene el frente abierto. La única pieza que lo cruza es una **viga** en la parte alta; no
hay pared frontal completa, porque taparía las estanterías y las hojas.

La viga sostiene el **letrero con el nombre de la sala**:

- `Proyecto` en la raíz;
- el nombre de la carpeta en las demás escalas.

El letrero no es seleccionable. El encuadre de la cámara incluye la viga y el letrero también en
salas altas, para que el nombre no se pierda.

### 3. La misma sala para todos los niveles

Suelo, paredes laterales, pared de fondo, techo, rodapiés, paneles y tira de luz son comunes. Los
archivadores van delante, las estanterías al fondo y las hojas miran a la cámara. La altura de la
sala depende de las estanterías, no del nivel.

### 4. Sin cambios de modelo

Todo se sigue derivando del `RenderModel` y del foco actual. No hay lentes nuevas, no se toca
`.codarch/` y el checksum no cambia. Funciona igual en el mapa de código y en el de
documentos/configuración.

### 5. La puerta animada queda para después

La entrada a una sala se hace con el vuelo de cámara actual. Una animación de puerta que se abre
mientras carga el Atlas, al estilo de Resident Evil, es una idea posterior: necesita su propio
tiempo, su propia decisión y una carga que no retrase el mapa. No entra en esta fase.

## Consecuencias

- El primer nivel deja de ser una excepción y el código de sala se simplifica.
- El proyecto se lee como un espacio, no como un tablero aparte.
- La viga da escala y nombre sin cerrar la vista.
- Las salas altas necesitan algo más de distancia de cámara para que la viga y su letrero entren en
  el encuadre.
- El pulido de distribución, luces y LOD sigue pendiente y se hace sobre esta base única.

## Alternativas descartadas

- **Mantener el overview plano.** Es la divergencia que se quiere quitar.
- **Cerrar el frente con una pared completa.** Tapa las estanterías y las hojas.
- **Un letrero flotante fuera de la viga.** Pierde la lectura de espacio y se confunde con el HUD.
- **La puerta animada ahora.** Añade una espera y una decisión visual que todavía no toca.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ El proyecto como primera sala.
- ✅ La viga frontal y el letrero con el nombre de la sala.
- ✅ El encuadre incluye la viga en salas altas.
- ⬜ El pulido de distribución, luces y LOD.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
