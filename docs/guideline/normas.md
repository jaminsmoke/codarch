## Los iconos
| Icono | Qué significa |
|---|---|
| 🧭 | una **decisión** (un ADR) |
| 🗺️ | una **hoja de ruta** |
| 🧪 | una **idea** (una entrada de esta guía) |
| ⚖️ | un **veredicto** |
| ✅ | **hecho** o **cerrada** |
| 🟡 | **en curso** |
| ⬜ | **sin empezar** |
| 🔧 | un **arreglo** (mejora sin fase) |
| ⏳ | **esperar** |

Los iconos son de categoría o de estado, no decoración: si una frase se entiende sin ellos, va sin
ellos. Los ✓ y ✗ siguen significando **hecho** y **no hecho** cuando hagan falta.

## Las categorías
Cada entrada dice **qué clase de trabajo es** además de qué se decidió. Las categorías son las del
**changelog de la guía** ([ADR 0035](../adr/0031-0040/0035-la-guia-como-changelog.md) ·
[ADR 0047](../adr/0041-0050/0047-el-changelog-es-la-guia.md)) y son un **set cerrado**:

| Categoría | Qué es |
|---|---|
| `feature` | algo **nuevo**: una capacidad que antes no estaba |
| `fix` | un **arreglo**: algo que prometía y no cumplía |
| `optimized` | lo mismo, **más rápido** o más barato |
| `refactor` | lo mismo, **mejor por dentro** |
| `docs` | **documentación**: lo que se lee, no lo que se ejecuta |
| `chore` | **mantenimiento**: versiones, repo, herramientas |
| `security` | **seguridad**: permisos, secretos, dependencias |
| `removed` | **quitar** algo que ya no se sostiene |

No todas se usan todos los días: el día pinta **solo las que tienen algo**, siempre en ese orden.
Y una entrada se **declara**: no se deduce del veredicto.

## Los veredictos
| Veredicto | Qué significa |
|---|---|
| `idea` | se quiere, pero no hay decisión ni fecha |
| `fase` | entra en el roadmap con su hoja de ruta |
| `adr` | se resuelve con un ADR, sin abrir una fase nueva |
| `arreglo` | es pequeña: se arregla sin fase ni ADR |
| `esperar` | la manera tiene que decidirse antes de ofrecerla |

## La regla
- Una idea **entra en el roadmap** como fase cuando tiene un resultado que se puede ver y un
  **ADR** si cambia el modelo del producto o sus reglas.
- Si lo que falta es una **decisión** (no trabajo), se queda aquí hasta que la decisión esté
  tomada.
- Si es una **mejora** de algo que ya existe, no necesita fase: se hace y se comprueba.
- Los **plugins** tienen su propia hoja de ruta (dentro de su carpeta), porque son piezas
  aparte: el sistema de plugins no crece con cada plugin.

## Cómo se coloca una idea aquí
1. Crear un fichero en `docs/guideline/entradas/` llamado `AAAA-MM-DD-NN-titulo.md`. El `NN` ordena
   las entradas del día; el título, en kebab-case, da el ancla.
2. Declarar en el frontmatter el `title`, la `date`, la `category` y el `verdict`.
3. Escribir el cuerpo: **qué es**, **por qué**, **qué falta**, el **veredicto** y el **tamaño**.
4. Respetar el orden cronológico: si una idea vieja vuelve, vuelve **a su sitio** (su fecha y su
   número).
5. Cuando el veredicto sea `fase`, la idea se mueve a la hoja de ruta de su decisión y aquí queda
   el rastro de por qué.

```yaml
---
title: El registro público de plugins
date: "2026-10-21"
category: feature
verdict: idea
---
```

La web la agrupa por fecha y categoría; añadir el fichero basta.
