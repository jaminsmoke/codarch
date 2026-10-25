---
title: La acción vuelve al monorepo
date: "2026-10-25"
category: chore
verdict: adr
---

**Qué era**: `jaminsmoke/codarch-action`, un repo público separado con una copia de `action.yml`, el render del comentario y el README. Nació porque el monorepo era privado y GitHub no resuelve una acción de un repo privado desde otro. Sincronizarlo era el último paso manual de cada publicación del CLI.

**Qué cambió**: el monorepo es público desde el 2026-10-22, así que la copia ya no hace falta. La acción se usa por subruta: `jaminsmoke/codarch/apps/github-action@v1`. El tag `v1` y el pin del CLI se mueven en el mismo workflow que publica en npm; `sync:action` y `.codarch/action-repo` desaparecen. El repo antiguo queda **archivado** con un aviso, no borrado, para que los `uses` viejos sigan funcionando.

**Números**: de dos repos y dos copias a uno solo. Un push, un pin y un tag. Se pierde el listado en Marketplace, que exige `action.yml` en la raíz; si algún día importa, se añade un `action.yml` raíz que delega, sin recuperar el repo separado.

**Veredicto**: [ADR 0066](../../adr/0061-0070/0066-la-accion-vuelve-al-monorepo.md), hecho. `codarch-action-smoke` ya apunta a la subruta.
