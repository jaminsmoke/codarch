---
title: El live es un indicador, no un botón
date: "2026-10-24"
category: refactor
verdict: arreglo
---

**Qué es**: que la cabecera diga si el repositorio se está vigilando —`live`, `live en pausa` o
`sin vigilancia`— junto al nombre y la fuente, y que el viejo botón **Live** desaparezca.

**Por qué**: era el último resto de cabecera distinta entre la web y el escritorio. Un botón que
solo existía en una app no cuenta el estado: lo cambia. Y el sitio natural para decir «el mapa se
refresca solo» es la cabecera, donde ya está el repo.

**Qué cambió**: `watch` vive en el hook (`live` | `paused` | `none`) y `AppShell` lo pinta como
indicador; la web lo pone según el servidor y el escritorio dirá `sin vigilancia` hasta que llegue
su vigilancia (M34). El botón de encender y apagar se muda a **Ajustes → Diagnóstico**, para no
perder la capacidad. Se añade una guarda en `apps/web/test/architecture.test.ts`: ninguna app pinta
las piezas del armazón y tienen tope de líneas, para que lo compartido siga yendo al hook.

**Veredicto**: arreglo de interfaz y mantenimiento; sigue M34 con la vigilancia del escritorio.
