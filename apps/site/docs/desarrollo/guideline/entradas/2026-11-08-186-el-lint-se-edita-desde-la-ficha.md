---
title: "El lint se edita desde la ficha"
date: "2026-11-08"
category: "feature"
verdict: "adr"
---

**Qué era**: el catálogo de **Docs y config** enseñaba las reglas activas, pero no dejaba tocarlas. CodArch era un espejo del proyecto: para desactivar una regla había que abrir el fichero a mano.

**Qué cambia**: la ficha es también un panel de control ([ADR 0111](/desarrollo/adr/0111-0120/0111-codarch-es-panel-de-control-del-lint/)). En oxlint, cada regla activa tiene un botón para desactivarla con confirmación en la propia fila —regla, fichero y cambio— y cada herramienta muestra las **recomendadas** que no están activas con un botón para activarlas. La escritura va al `.oxlintrc.json` del proyecto, no a una lista paralela: `npm run lint` y CodArch siguen viendo lo mismo. El servidor valida origen, sistema y regla, escribe de forma atómica y pide al live que reanalice.

**Por qué así**: desactivar una regla explícita la quita; si puede venir de una categoría, escribe `off` en la config. No se reescribe `eslint.config.js`: es código y necesita un escritor con AST, que queda para otra entrega.

**Verificado**: el catálogo muestra las 24 reglas de ESLint y las 5 de oxlint; las recomendadas de oxlint incluyen `no-eval` y `no-implied-eval`. En un servidor de prueba, activar `no-eval` añadió la entrada y desactivarla la quitó; los tests cubren activar, desactivar con confirmación, config inválida y una plataforma sin escritura.

**Qué falta**: ESLint con AST; deshacer la última escritura; recomendaciones específicas por proyecto.

**Tamaño**: el catálogo recomendado y el escritor en `@codarch/lint`; la ruta en `serve`; la acción de plataforma; la ficha en `packages/ui`.

**Veredicto**: hecho.
