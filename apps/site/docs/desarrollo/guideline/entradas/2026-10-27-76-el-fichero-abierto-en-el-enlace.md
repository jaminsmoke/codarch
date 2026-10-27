---
title: El fichero abierto, en el enlace
date: "2026-10-27"
category: feature
verdict: adr
---

**Qué era**: el [ADR 0087](../adr/0081-0090/0087-el-fichero-entero-en-el-escenario.md) dejó el fichero abierto fuera de la URL: señalar un fichero en un ticket era escribir la ruta y esperar a que el otro entrara, lo encontrara en el mapa y hiciera doble clic.

**Qué es**: la URL gana **`code`** con la ruta del fichero que ocupa el escenario —`?file=…&tab=file&code=…`— y al arrancar se abre si está en el snapshot ([ADR 0088](../adr/0081-0090/0088-el-fichero-abierto-va-en-la-url.md)). Cerrar el código (ruta, `Esc` o **← Mapa**) quita la clave. Si la ruta ya no está se ignora, y si la plataforma no puede leer el fichero —la demo estática— el escenario lo dice y deja volver al mapa.

**Por qué así**: `code` lleva su propia ruta, así que no puede contradecir a `file` como haría un `view=code` que dependiera de otra clave. Se escribe con `replaceState`, como el resto del estado de vista ([ADR 0018](../adr/0011-0020/0018-estado-vista-en-la-url.md)): abrir código no añade una entrada al historial del navegador, y para volver están la ruta, `Esc` y el botón. Las vistas guardadas de un addon no lo llevan: su lista de claves es cerrada.

**Cómo se comprueba**: `packages/ui/test/viewState.test.ts` cubre leer, escribir y quitar `code`, que un enlace valga solo con `code` y que una vista guardada no abra código. En la app servida, el doble clic deja `code=packages/ui/src/useCodarchApp.tsx`, recargar abre ese fichero directamente y **← Mapa** lo quita.

**Veredicto**: ADR 0088, sin fase nueva.
