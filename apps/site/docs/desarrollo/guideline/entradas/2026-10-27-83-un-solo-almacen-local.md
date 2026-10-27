---
title: Un solo almacén local
date: "2026-10-27"
category: refactor
verdict: arreglo
---

**Qué era**: las preferencias y los plugins se leían y se escribían con cuatro funciones **copiadas literalmente** en la web y en el escritorio, y el `getStorage()` privado de cada una era una tercera copia del `localStore()` que ya vivía en `packages/ui`. Lo de alrededor sí había divergido: el guardia de forma de un proyecto guardado estaba escrito dos veces —la web olvidaba los `addons` al leer, el escritorio los dejaba en `[]`—, y las claves eran literales sueltos por los dos módulos.

**Qué es**: `@codarch/ui/storage` es el almacén de la máquina: las claves (`codarch.preferences.v1`, `codarch.plugins.v1`, `codarch.project.v1`), las preferencias, los plugins, el guardia `parseSavedProject` y las lecturas y olvidos por clave. Cada app se queda con lo suyo: la web, el proyecto en `localStorage` con su tope de tamaño y su costumbre de olvidar el que no se entiende; el escritorio, la raíz del último repo y el proyecto de la versión anterior para migrarlo. Los dos siguen importando de `./storage` como antes: lo que cambia es de dónde sale.

**Por qué así**: es la costura que ya decidieron el [ADR 0073](../adr/0071-0080/0073-una-sola-interfaz.md) y el [ADR 0074](../adr/0071-0080/0074-una-sola-sesion.md): el transporte y el sitio del estado son de cada plataforma, la lógica no. No hay ADR nuevo porque no cambia el modelo, ni el contrato `Plataforma`, ni lo que se ve: es deuda pagada dentro de una decisión que ya estaba tomada. Se descartó mover también el proyecto a un solo sitio —la web no tiene `.codarch/` donde dejarlo (ADR 0048)— y se descartó un `localStorage` compartido para el estado del repo, que sigue siendo del repo.

**Cómo se comprueba**: los tests de las dos apps **no se han tocado** y siguen verdes, que es la prueba de que el comportamiento es el mismo: `apps/web/test/storage.test.ts` cubre preferencias y proyecto, y `apps/desktop/test/storage.test.ts` cubre la raíz y el proyecto viejo. El módulo compartido estrena el suyo: preferencias, plugins, sin almacén, el guardia del proyecto, los `addons` y el olvido por clave. Los tres módulos pasan de 350 a 330 líneas; lo que desaparece es la copia, no las líneas.

**Veredicto**: arreglo dentro del ADR 0073 y el ADR 0074. Queda pendiente lo demás de la misma lista: las proyecciones `chains → heat` y `history → entries`, que los dos adaptadores `Plataforma` siguen escribiendo por su cuenta.
