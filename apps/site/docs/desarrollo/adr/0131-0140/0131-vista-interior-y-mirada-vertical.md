---
title: "ADR 0131 — Vista interior y mirada vertical"
description: "Una vista anclada dentro de la sala gira sobre su eje, permite mirar arriba y deja crecer las salas sin que la cámara se escape."
section: desarrollo
status: aceptado
date: "2026-11-09"
sidebar:
  label: Vista interior
  order: 131
---

**Estado:** aceptado · **Fecha:** 2026-11-09

**Continúa** el [ADR 0130](0121-0130/0130-composicion-interior.md): la sala ya se ajusta al contenido;
ahora la cámara también puede entrar en ella.

## Contexto

La vista general orbita desde fuera de la sala. Al acercarse mucho, la cámara llega cerca del centro,
pero seguía mirando al objetivo y el tope vertical impedía subir la mirada. Las salas grandes
obligaban a alejar la cámara hasta salir del volumen.

## Decisión

### 1. Vista interior anclada

El botón **Centro** (o la tecla `C`) ancla la cámara dentro de la sala, a un tercio de la profundidad
y a la altura de los ojos. La mirada va hacia la pared de fondo.

- Arrastrar gira **sobre el eje de la cámara**, no alrededor de un objetivo exterior.
- El giro horizontal no tiene el arco limitado de la órbita exterior.
- La posición anclada se mueve con una transición amortiguada; no hay salto.

### 2. Mirar arriba

En la vista anclada, `polar` llega hasta casi el cenit y la cámara **no atraviesa el suelo** porque su
posición está fija. En la órbita exterior, la altura de la cámara se limita al suelo visible para que
pueda mirar arriba sin caer por debajo de la sala.

La sala no tiene techo; al mirar arriba se ve el cielo oscuro de la escena, que es intencionado.

### 3. Salas mayores

La planta mínima sube a 28 × 22 y la profundidad acompaña al ancho. Con la vista interior, una sala
mayor no obliga a que la cámara quede fuera: se recorre desde dentro.

### 4. Convivencia con los focos

`Centrar` y los vuelos de fichero o carpeta salen de la vista anclada. La rueda y `+`/`−` siguen
perteneciendo a la órbita exterior; la vista interior es para mirar, no para alejar la cámara.

## Consecuencias

- La cámara puede quedarse dentro y girar sin enseñar el exterior.
- La mirada vertical gana recorrido; el suelo no se atraviesa.
- Las salas pueden crecer sin que la composición dependa de una cámara lejana.
- El modo interior no cambia el modelo, el checksum ni `.codarch/`.

## Alternativas descartadas

- **Seguir orbitando desde fuera.** La sala grande se ve desde muy lejos.
- **Bajar el objetivo para mirar arriba.** La cámara termina bajo el suelo.
- **Anclar sin transición.** El cambio de vista da un salto.
- **Poner techo.** Cierra la lectura de profundidad que se decidió en el ADR 0122.

## Hoja de ruta

Fase **M77 · El Atlas frontal**.

- ✅ Vista interior anclada con giro sobre el eje.
- ✅ Mirada vertical con suelo como límite en la órbita exterior.
- ✅ Salas mayores (28 × 22 mínimos).
- 🟡 Composición y luces en las salas grandes.
- ⬜ La puerta animada de entrada, si se decide.
- ⬜ El editor completo.

El registro de lo hecho vive en el [feed de la guía](/desarrollo/guia/).
