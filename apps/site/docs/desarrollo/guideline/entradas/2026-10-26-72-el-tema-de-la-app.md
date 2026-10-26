---
title: El tema de la app
date: "2026-10-26"
category: feature
verdict: adr
---

**Qué era**: un solo tema, hojas claras y armazón oscuro. El [ADR 0082](../adr/0081-0090/0082-el-marco-de-la-app.md) dejó los colores del marco en cuatro tokens y aparcó el tema para su fase; la [entrada 64](2026-10-26-64-el-tema-en-ajustes.md) dejó las preguntas abiertas. Quien trabaja de noche no tenía cómo bajar el papel, y con el sistema en oscuro un navegador puede imponer su modo automático, que apaga los grises y se lleva por delante las lentes del mapa.

**Qué es**: **Ajustes › General**, la primera sección del diálogo, con tres opciones —**Claro**, **Oscuro** y **El sistema**—, y una segunda paleta completa en `styles.css`. El [ADR 0084](../adr/0081-0090/0084-el-tema-de-la-app.md) decide lo que faltaba: la preferencia es de la máquina (`localStorage`, clave `codarch-theme`), no del repositorio; «el sistema» se resuelve a claro u oscuro antes de pintar, y el CSS solo atiende un caso, `data-theme` en `<html>`; y los colores con significado —las teselas del mapa, los lenguajes, los estados de migración, el verde y el rojo de un diff— no se tocan.

**Por qué así**: invertir la página con un filtro o dejarla al modo oscuro del navegador es lo que rompe las lentes: un tema propio elige los colores en vez de cambiarlos de signo. El armazón no se aclara en oscuro; se oscurece hasta casi negro, porque sigue siendo el borde. Y lo que se dibuja sobre el papel —la retícula, el borde de las carpetas y su rótulo— pasa a tokens para no desaparecer.

**Cómo se comprueba**: en el navegador, con el sistema en oscuro, la app arranca en oscuro; al elegir Claro y recargar sigue en claro —la primera pintura ya sale con el tema guardado, porque las dos apps lo aplican en su `main.tsx` antes de montar React—. `packages/ui/test/tema.test.ts` mide la paleta oscura: tinta 14,9:1, tenue 6,6:1, acentos entre 7,0 y 9,1:1 y estados entre 7,2 y 9,3:1 sobre papel, panel y hoja, y el icono del marco 7,4:1. De paso, la tinta tenue del tema claro sube a #5f6d76 (5,0:1 sobre el panel; antes 4,4:1).

**Veredicto**: ADR 0084, sin fase nueva. Queda por rehacer las capturas de los dos temas.
