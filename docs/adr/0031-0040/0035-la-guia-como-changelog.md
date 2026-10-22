# ADR 0035 — La guía se lee como un changelog

**Estado:** aceptado · **Fecha:** 2026-10-22

## Contexto

La guía ✓ (`docs/guideline/contenido.md` ✅) guarda lo que se piensa ✓ y lo que se hace ✓, **día a
día** ✅. Cada entrada dice **qué se decidió** ✅ —su veredicto ✅: fase ✅, arreglo ✅, esperar ✅—
pero no dice **qué clase de trabajo es** ✅ ✗.

Se nota al leer un día entero ✅: el 22 de octubre ✅ tiene seis entradas ✅, todas «fase» ✅, y entre
ellas hay **dos features** ✅, **dos de documentos** ✅ y **dos de mantenimiento** ✅. El día las pinta
seguidas ✅ y el lector no ve la diferencia ✅ ✗.

Los **changelogs** ✅ llevan años resolviendo esto ✅ (Keep a Changelog ✅, los commits
convencionales ✅): secciones por **clase de cambio** ✅, y cada día pinta **solo las que tienen
algo** ✅. Es el formato que la guía ya insinúa con sus veredictos ✅ pero no dice ✅.

## Decisión

### 1. Dos ejes: categoría y veredicto

La línea de metadatos ✅ pasa a decir las dos cosas ✅:

```markdown
## La web del proyecto
*feature · fase · 2026-10-22*
```

- **Categoría** ✅: qué clase de trabajo es ✅ (feature ✅, docs ✅, fix ✅…).
- **Veredicto** ✅: qué se decidió ✅ (fase ✅, arreglo ✅, esperar ✅, idea ✅), como hasta ahora ✅.

### 2. Un set cerrado de categorías, el de los changelogs

| Categoría | Qué es |
|---|---|
| `feature` | algo **nuevo** ✓: una capacidad que antes no estaba ✓ |
| `fix` | un **arreglo** ✓: algo que prometía y no cumplía ✓ |
| `optimized` | lo mismo ✓, **más rápido** ✓ o más barato ✓ |
| `refactor` | lo mismo ✓, **mejor por dentro** ✓ |
| `docs` | **documentación** ✓: lo que se lee ✓, no lo que se ejecuta ✓ |
| `chore` | **mantenimiento** ✓: versiones ✓, repo ✓, herramientas ✓ |
| `security` | **seguridad** ✓: permisos ✓, secretos ✓, dependencias ✓ |
| `removed` | **quitar** ✓ algo que ya no se sostiene ✓ |

Es un **set cerrado** ✓: una entrada nueva elige de aquí ✓, no inventa ✓. No todas se usan todos los
días ✓, y el día pinta **solo las que tienen algo** ✓, **siempre en ese orden** ✓.

### 3. El día es un changelog

La web ✓ pinta cada día ✓ con **un grupo por categoría** ✓: su nombre ✓, su cuenta ✓ y sus entradas
✓. Un grupo vacío **no se pinta** ✓. Las entradas de un grupo guardan el orden en que se escribieron
✓.

Las que **esperan** ✓ (veredicto `esperar` ✓) siguen yendo a la sección **Futuro** ✓, con su
categoría a la vista ✓ y sin grupos ✓: son una lista de lo que falta ✓, no el changelog de un día ✓.

### 4. El markdown sigue siendo la verdad

La categoría vive en `contenido.md` ✓, no en los componentes ✓: la web **agrupa** ✓, no reescribe ✓.
Una entrada se declara ✓, no se deduce ✓: el veredicto `fase` no dice si fue feature ✓ o docs ✓ ✗.

Los nombres de las categorías van en **inglés técnico** ✓, como los commits ✓ (`feat:` ✓, `fix:` ✓);
las etiquetas que se leen van en **español** ✓.

## Consecuencias

- Un día se lee igual siempre ✓: features arriba ✓, luego fixes ✓, luego lo demás ✓.
- Se ve de un vistazo **qué clase de día** fue ✓: el 22 de octubre fue de features ✓, docs ✓ y
  mantenimiento ✓.
- Una entrada nueva necesita **categoría y veredicto** ✓: dos decisiones pequeñas al escribirla ✓.
- El **checksum no cambia** ✓: es documentación ✓ (la regla de
  [ADR 0029](../0021-0030/0029-los-addons.md) sigue intacta ✓).

## Alternativas descartadas

- **Solo Keep a Changelog** ✓ ✗: `Added` ✓, `Changed` ✓, `Fixed` ✓… como único eje ✓ pierde el
  veredicto ✓, que es lo que dice si la idea es fase ✓ o espera ✓.
- **Etiquetas libres** ✓ ✗: cada día inventaría sus grupos ✓ y la guía dejaría de ser estándar ✓,
  que es justo lo que se busca ✓.
- **Deducir la categoría del veredicto** ✓ ✗: `fase` no distingue feature ✓ de docs ✓; `arreglo` y
  `fix` se solapan ✓ y el resto no tiene equivalente ✓.
- **Grupos en el cuerpo del markdown** ✓ ✗: serían tres verdades ✓ —el día ✓, el grupo ✓ y el
  orden ✓— donde basta una ✓.

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Las claves de las categorías van en inglés
técnico, como los commits.
