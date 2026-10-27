---
title: El inspector se pliega desde su entrada
date: "2026-10-27"
category: feature
verdict: adr
---

**Qué era**: la barra de actividad del [ADR 0079](../../adr/0071-0080/0079-el-inspector-con-barra-de-actividad.md) cambiaba de apartado, pero no se apartaba nunca: con un fichero de símbolos largos, el panel derecho se quedaba con su ancho y el mapa no lo recuperaba. El dock de herramientas de la izquierda, en cambio, se plegaba desde su icono ([ADR 0083](../../adr/0081-0090/0083-el-dock-de-herramientas.md)), y dos gestos distintos para la misma clase de panel se aprenden mal.

**Qué es**: pulsar la entrada que ya está a la vista pliega la hoja y deja solo la barra; pulsarla otra vez la vuelve a abrir. Pulsar el otro apartado lo cambia sin plegar. La barra sigue ahí, con su `aria-expanded`, y el plegado se recuerda entre visitas como el de una sección. El mapa gana el ancho de la hoja.

**Por qué así**: es el mismo gesto y la misma memoria que la barra izquierda, en vez de un control nuevo para lo mismo. El plegado no va a la URL: la URL dice qué apartado se lee, no cuánto ancho ocupa, así que un enlace compartido no le esconde el panel a quien lo abre.

**Cómo se comprueba**: `toggleInspector` vive en `viewState.ts` y `viewState.test.ts` cubre los tres casos —plegar, volver a abrir y cambiar de hoja—. En la app servida, pulsar **Fichero** dos veces esconde la ficha y deja la barra, y pulsarla de nuevo la devuelve con el mismo apartado.

**Veredicto**: enmienda al ADR 0079, sin fase nueva.
