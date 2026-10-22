# ADR 0029 — Los addons: conocimiento declarativo

**Estado:** aceptado · **Fecha:** 2026-10-22

## Contexto

El producto ya se extiende por un camino ✓: los **plugins** ✓ (ADR 0028 ✓). Un plugin es **código del
repo** ✓ que se compila ✓ y se activa ✓, y que puede pintar una vista nueva ✓ (la 3D es la prueba ✓).

Ese camino no sirve para todo lo que la gente quiere compartir ✓. Un equipo que trabaja con NestJS
✓ no quiere una vista nueva ✗: quiere que **sus capas** ✓, **sus reglas** ✓ y **una vista inicial
razonable** ✓ estén puestas desde el primer día ✓, y quiere que las tengan sus compañeros ✓ y su CI
✓. Hoy eso es un README con un bloque para copiar en `.codarch.yml` ✗: cada equipo lo copia ✓, se
desincroniza ✓ y nadie sabe de dónde salió ✗.

Lo que hace falta no es *código* ✗: es **conocimiento** ✓ — qué carpetas son capas ✓, qué no puede
depender de qué ✓, desde dónde se mira el mapa ✓.

Y hay una decisión previa, ya tomada ✓: **un addon no añade lentes al modelo** ✓. El checksum cubre
`files` + `lenses` ✓, así que una lente traída de fuera haría que el mismo código diera checksums
distintos según lo que tengas instalado ✗ ✗. La vía para poder hacerlo existe ✓ (el productor dentro
del snapshot ✓ → "el mismo código + los mismos addons = el mismo checksum" ✓), pero hay que diseñarla
antes de escribirla ✓. Hoy vamos con **A** ✓, con propósito de migrar a **B** ✓ cuando la manera esté
decidida ✓.

La pregunta es, entonces: **¿qué es un addon, qué aporta y de dónde sale?**

## Decisión

### 1. Un addon es datos, no código

Un addon es una **carpeta** ✓ con un manifiesto ✓ y ficheros declarativos ✓. No se ejecuta ✗: la app
los **lee** ✓ y los aplica con lo que ya sabe hacer ✓.

De ahí sale todo lo demás ✓:

- **Se puede auditar** ✓: es YAML y JSON ✓, se lee y se entiende ✓. Instalar un addon no es confiar
  código arbitrario ✓, es leer una configuración ✓.
- **Funciona en las dos apps** ✓ (y en el CLI ✓, el MCP ✓ y la acción ✓): no hay bundle que recompilar
  ✓ ni runtime que cargar ✓.
- **No puede romper el checksum** ✓ ✗: no toca ni `files` ✓ ni `lenses` ✓.
- **Un registro es barato** ✓: distribuir datos con un hash es mucho menos que firmar código ✓ (la
  guía, G1 ✓).

### 2. Vive donde vive la configuración

```
addons/nestjs/
  addon.json
  profiles/nestjs.yml
  rules.yml
  views/aplicacion.yml
  README.md
```

Y el repo los declara en `.codarch.yml`, al lado de los plugins ✓:

```yaml
addons:
  - nestjs
```

**Empezó en `.codarch/addons/`** y se movió a `addons/` al empezar a construirlo ✓: `.codarch/`
es la carpeta de **artefactos** del repo ✓ (está ignorada por git ✓), así que un addon ahí no viajaría
con el repo ✗ — justo lo contrario de lo que se busca ✓. `addons/` en la raíz se ve en el PR ✓ y
no hay que tocar el `.gitignore` de nadie ✓.

Lo que está en el repo **viaja con el repo** ✓: los compañeros lo tienen al hacer `pull` ✓, el PR lo
revisa ✓, el CI lo aplica ✓ y el comentario del PR dice lo mismo que en tu máquina ✓. **El proyecto
es la unidad de instalación** ✓, no la máquina ✓ — que es justo lo que hace reproducible el reporte
✓.

Un addon personal ✓ (una variante que solo quieres tú ✓) se queda fuera ✓ de momento: haría que dos
personas del mismo repo vieran reportes distintos ✗ ✗, y eso es exactamente lo que no queremos ✓.

### 3. Qué aporta: perfiles, reglas y vistas

El manifiesto **declara** ✓ y apunta a los ficheros ✓:

```json
{
  "name": "nestjs",
  "version": "0.1.0",
  "title": "Convenciones de NestJS",
  "description": "Las capas de un repo NestJS, sus prohibiciones y una vista para verlas.",
  "homepage": "https://ejemplo.dev/addons/nestjs",
  "contributes": {
    "profiles": ["./profiles/nestjs.yml"],
    "rules": ["./rules.yml"],
    "views": ["./views/aplicacion.yml"]
  }
}
```

Las tres piezas son cosas que el motor **ya entiende** ✓:

| pieza | qué es | dónde vive hoy |
|---|---|---|
| `profiles` | capas + reglas de un estilo de arquitectura | catálogo del motor ✓ (ADR 0023 ✓) y `profiles:` de `.codarch.yml` ✓ |
| `rules` | prohibiciones, umbrales y ciclos | `rules:` de `.codarch.yml` ✓ |
| `views` | estados de vista con nombre (métrica de área ✓, modo de color ✓, foco ✓, etiquetas ✓) | el estado de la vista ✓ (ADR 0018 ✓) |

Un `profile` de un addon tiene **la misma forma** ✓ que uno del catálogo ✓ o que uno escrito en
`.codarch.yml` ✓: no hay un segundo dialecto ✓. Y una `view` es un estado de vista ✓ guardado con
nombre ✓ — lo que hoy se consigue copiando una URL ✓ ✓.

Una consecuencia útil ✓: el addon puede traer **documentación** ✓ (`README.md` ✓), y el store la
enseña ✓: qué capas añade ✓, qué reglas trae ✓ y por qué ✓.

### 4. Qué no puede: lentes ni código

Un addon **no** aporta lentes ✓ (el checksum cubre `files` + `lenses` ✓), **no** aporta código ✓ (eso es un plugin ✓) y **no** habla con la red ✓ ni con el disco ✓ al cargarse ✓.

La frontera queda así:

| | aporta | puede cambiar el checksum | se instala |
|---|---|---|---|
| **plugin** | código ✓ (vistas ✓) | no ✓ | compilado ✓ (ADR 0028 ✓) |
| **addon** | conocimiento ✓ (perfiles ✓, reglas ✓, vistas guardadas ✓) | no ✓ | copiando una carpeta ✓ |
| **lente** | medidas ✓ | **sí** ✗ | hoy solo del motor ✓ |

### 5. La precedencia es la de un perfil

Manda el equipo ✓, luego los addons ✓ (en el orden en que se declaran ✓), luego el catálogo ✓:

1. **La configuración del equipo** ✓ — es la última palabra ✓.
2. **Los addons** ✓, en orden ✓ — el que va después gana ✓.
3. **El catálogo del motor** ✓.

Se fusiona **por nombre** ✓, igual que hoy con los perfiles ✓: una regla del equipo con el mismo
nombre sustituye a la del addon ✓, y así se puede subir de `warn` a `error` sin tocar el addon ✓ ✓.

### 6. Se valida y se nombra

- El manifiesto se valida al cargar ✓. Una clave desconocida es **error** ✗ (no se ignora ✗): un
  `profiles` mal escrito no puede pasar por bueno en silencio ✓.
- Cada pieza trae su **origen** ✓: `source: "addon:nestjs"` ✓. El reporte y el comentario del PR dicen
  de dónde sale cada regla ✓ ✓ — que es lo que hoy no se puede saber de un `.codarch.yml` copiado ✓.

### 7. Instalar es copiar una carpeta

```bash
codarch addons list          # los que declara el repo y qué aporta cada uno
codarch addons add ./nestjs  # copia la carpeta a addons/ y la declara
codarch addons remove nestjs # la quita del repo y de la declaración
```

No hay descarga desde una URL ✓ ni registro ✗ **todavía** ✓: un addon es una carpeta ✓, y traerla es
cosa de git ✓, un zip ✓ o el README de quien lo publica ✓. La distribución tiene su propia decisión ✓
(la guía, G1 ✓).

### 8. La puerta a las lentes, cuando se decida

Un addon que quiera **medir** algo ✓ necesitará una lente ✓, y una lente cambia el checksum ✗. Ese día
la regla será ✓:

> **el mismo código + los mismos addons = el mismo checksum** ✓

y el snapshot tendrá que guardar **quién produjo cada lente** ✓ (nombre ✓, versión ✓, hash ✓) ✓. Eso
necesita su propio ADR ✓, porque cambia qué significa el checksum ✓ ✓. Hasta entonces, un addon que
necesite una señal nueva la calcula **en su vista** ✓ (como hace el 3D ✓), sin compartirla ✓.

## Consecuencias

- Un paquete pequeño ✓ `@codarch/addons` ✓: el esquema del manifiesto ✓, la validación ✓ y la fusión
  con la configuración ✓. Lo usan el CLI ✓, la web ✓, el escritorio ✓ y el MCP ✓ — por eso es paquete
  y no una carpeta de una app ✗.
- `.codarch.yml` gana `addons:` ✓ y el addon vive en `addons/<nombre>/` ✓. El parser de reglas (`@codarch/metrics` ✓) acepta las piezas ya
  validadas ✓: la fusión por nombre es **la misma** que la de los perfiles ✓ ✓.
- El MCP y la acción **tienen que leer la configuración** ✓ para verlos ✓ — lo que ya hacía el CLI ✓
  (la guía, G4.9 ✓).
- El store de los ajustes muestra los addons **del proyecto** ✓ en modo lectura ✓ (los declara el
  repo ✓); lo que se activa o desactiva ahí son los **plugins** ✓ (ADR 0027 ✓), que son otra cosa ✓.
- El checksum no cambia ✓: un addon vive en la capa de la configuración ✓, como un `.codarch.yml`
  distinto ✓. El snapshot dice **cómo es el código** ✓; el reporte dice **qué se incumple** ✓.
- Distribuir addons es mucho más barato que distribuir plugins ✓: son datos ✓ y un hash ✓ basta ✓.

## Alternativas descartadas

- **Que un addon sea código** (un plugin de fuera). Descartado ✓: en la web no se puede cargar en
  caliente ✗ y en el escritorio obligaría a recompilar ✗; y obligaría a firmarlo ✗. Eso ya tiene su
  camino ✓ (ADR 0028 ✓).
- **Que un addon añada lentes.** Descartado **hoy** ✓: cambiaría el checksum según lo instalado ✗.
  Es la vía B ✓, con su propio ADR ✓.
- **Addons como paquetes de npm.** Descartado ✓: un addon no es una dependencia ✗ ✓; es conocimiento
  ✓ que se revisa en el PR ✓.
- **Addons personales, en la máquina del usuario.** Descartado **por ahora** ✓: romperían la
  reproducibilidad del reporte dentro del mismo repo ✗ (dos personas ✓, dos resultados ✗).
- **Un registro desde el primer día.** Descartado ✓: primero el contrato ✓; la distribución ✓ (firma
  ✓, índice ✓, versiones ✓) es una decisión aparte ✓.

## Nota de estilo

El idioma del producto es español; este ADR lo sigue. Los nombres de código van en inglés técnico.
