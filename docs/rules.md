# Reglas de arquitectura

`codarch diff` puede evaluar una política versionada en `.codarch.yml`. Las reglas no se guardan en
el snapshot: el snapshot dice **cómo es** el código; la configuración dice **cómo debería ser**.

## Ejemplo

```yaml
version: 1

layers:
  - name: domain
    paths:
      - src/domain/**
  - name: application
    paths:
      - src/application/**
  - name: infrastructure
    paths:
      - src/infra/**

rules:
  - name: domain-no-infra
    type: forbidden
    from: domain
    to: infrastructure
    severity: error
    message: El dominio no puede depender de infraestructura

  - name: complejidad-maxima
    type: threshold
    metric: maxComplexity
    max: 40
    severity: warn

  - name: sin-ciclos
    type: cycles
    severity: error
```

## Perfiles

Un perfil es una configuración de reglas escrita de antemano. `codarch profiles` lista el catálogo:

```bash
codarch profiles
codarch profiles --json
```

El catálogo de hoy:

| Perfil | Para repos con | Capas |
|---|---|---|
| `capas` | `src/domain`, `src/application`, `src/infra` | domain, application, infrastructure |
| `hexagonal` | puertos en el centro y adaptadores fuera | domain, application, adapters |
| `onion` | capa de presentación propia | domain, application, infrastructure, presentation |
| `ddd` | modelo, servicios y repositorios | domain, application, infrastructure |

Los repos que se organizan **por módulo o por feature** no encajan en ningún perfil estático: sus
capas las decide el repositorio, y por eso las propone el generador
([ADR 0023](adr/0021-0030/0023-lente-de-dominio-por-pasos.md)).

Para usar un perfil, en `.codarch.yml`:

```yaml
version: 1
profile: capas
```

El perfil aporta sus capas y sus reglas, y el equipo puede añadir las suyas encima. Lo que trae el
perfil entra **como aviso** (`warn`): consulta, no bloquea. Una regla del equipo con el mismo nombre
sustituye a la del perfil, así que endurecerla es escribirla otra vez con `severity: error`:

```yaml
version: 1
profile: capas
rules:
  - name: dominio-sin-infraestructura
    type: forbidden
    from: domain
    to: infrastructure
    severity: error
```

En el reporte, cada violación dice de dónde sale (`source: "config"` o `source: "profile"`) y el
reporte lleva el perfil aplicado (`rules.profile`). Así nadie bloquea un PR por una regla que no
escribió, y endurecer una es una decisión consciente
([ADR 0023](adr/0021-0030/0023-lente-de-dominio-por-pasos.md)).

### Endurecer un perfil

Por defecto las reglas de un perfil son avisos. Cuando el código esté preparado, se suben de golpe:

```yaml
version: 1
profile: capas
profile_severity: error
```

También se puede endurecer una sola regla, escribiéndola en el archivo del equipo con el mismo
nombre: lo del equipo sustituye a lo del perfil.

### Perfiles propios

Un equipo puede guardar sus convenciones como perfil, en el mismo archivo:

```yaml
version: 1
profile: mi-equipo
profiles:
  - id: mi-equipo
    title: Convenciones del equipo
    layers:
      - name: nucleo
        patterns: [src/nucleo/**]
      - name: extras
        patterns: [src/extras/**]
    rules:
      - name: nucleo-sin-extras
        type: forbidden
        from: nucleo
        to: extras
```

Los perfiles propios tienen la misma forma que los del catálogo y también entran como aviso.

## Generar las capas

Si el repo no encaja en ningún perfil, `codarch suggest` deduce la estructura del propio código:

```bash
codarch suggest .codarch/snapshot.cc.json
codarch suggest .codarch/snapshot.cc.json --json
```

Agrupar los ficheros por carpeta, mirar el grafo de dependencias y ordenar las capas de más interior
a más exterior. Con eso propone unas capas y las reglas que las protegerían, en un fragmento listo
para `.codarch.yml`:

```yaml
version: 1
layers:
  - name: src/domain
    paths:
      - src/domain/**
  - name: src/infra
    paths:
      - src/infra/**
rules:
  - name: src-domain-sin-src-infra
    type: forbidden
    from: src/domain
    to: src/infra
    severity: warn
    message: src/domain no debe depender de src/infra
```

Es la **versión 0.01** del generador: agrupa por el primer y segundo nivel del directorio y supone
que las dependencias van hacia dentro. Los ficheros sueltos en la raíz (los puntos de entrada) no
forman capa, y el comando lo dice.

Además dice **qué perfil del catálogo encaja** con lo que ha deducido, y si el código incumple hoy
alguna de sus reglas:

```
  Encaje con el catálogo de perfiles:

    capas        2 de 3 capas · cubre el 100% del código
    hexagonal    2 de 3 capas · cubre el 100% del código
    onion        2 de 4 capas · cubre el 100% del código

  Con el perfil "capas", el código incumple hoy 1 regla:
    · El dominio no debe depender de la infraestructura
```

Cuando un perfil encaja, la propuesta usa **sus** capas y reglas, no las que se deducen del código:
la convención la pone el perfil. Si no encaja ninguno, la propuesta se deduce del grafo (y entonces
el orden de las capas sale de lo que el código ya hace).

Propone, no decide: la salida se revisa y se pega. Como las reglas del perfil, salen como aviso.

## Capas
- `patterns` (o su alias `paths`) son globs relativos al root del proyecto, con `/`.
- Se evalúan en orden: **gana la primera capa que coincide**.
- Un fichero sin capa no participa en reglas `forbidden`.
- Los patrones no pueden ser absolutos. Los `\` se normalizan a `/`.
- Para una regla de capas solo cuentan las aristas internas que el analizador pudo resolver.

## Reglas

### `forbidden`

```yaml
- name: domain-no-infra
  type: forbidden
  from: domain
  to: infrastructure
  severity: error
  message: "El dominio no puede depender de infraestructura"
```

Marca cada arista de head que va de `from` a `to`. La clave de la violación es la regla y la pareja
de ids de fichero, así que mover el mismo import no crea una violación nueva.

### `threshold`

```yaml
- name: complejidad-maxima
  type: threshold
  metric: maxComplexity
  max: 40
  severity: warn
```

Evalúa la métrica por fichero. Se puede usar `max`, `min` o ambos; al menos uno es obligatorio. Si
la métrica no existe en un fichero, no se evalúa. Un fichero nuevo que ya nace fuera de rango cuenta
como violación introducida.

### `cycles`

```yaml
- name: sin-ciclos
  type: cycles
  severity: error
```

Marca los componentes fuertemente conexos de head (tamaño > 1 o self-loop) **del grafo de
ejecución**: una arista cuenta si `weight > typeOnly`. Los imports que solo son de tipos siguen en
el snapshot, pero no cierran un ciclo ni violan esta regla ([ADR
0037](adr/0031-0040/0037-los-ciclos-de-ejecucion.md)). La clave usa los ids del componente: un ciclo
que cambia de tamaño aparece como uno resuelto y otro introducido.

## Severidad y gate

| Severidad | Se muestra | `--fail-on violations` |
|---|---|---|
| `info` | sí | no |
| `warn` | sí | no |
| `error` | sí | sí, si es introducida |

`--fail-on`:

- `none`: nunca falla por hallazgos (por defecto).
- `cycles`: falla si hay ciclos nuevos.
- `violations`: falla si hay violaciones **introducidas** con severidad `error`.
- `hotspots`: falla si hay hotspots nuevos.
- `any`: combina las tres anteriores.

El código de salida es `2` cuando falla el gate y `1` cuando hay un error de lectura o de
configuración. Así un workflow distingue “el PR rompe la política” de “la herramienta falló”.

## Qué se considera nuevo

Se evalúan base y head y se comparan las claves estables de las violaciones:

- `introduced`: está en head y no en base.
- `existing`: está en ambos; es deuda previa y no bloquea.
- `resolved`: estaba en base y ya no está en head.

Esto permite adoptar reglas en un repo con deuda sin congelar todos los PRs.

## Carga

- `codarch diff base.cc.json head.cc.json` busca `.codarch.yml` o `.codarch.yaml` en el cwd.
- `--config ruta.yml` usa otra política.
- `--no-config` desactiva las reglas por completo.

La configuración no se copia al snapshot ni al mapa. El reporte incluye un bloque `rules` con el
resumen y las violaciones; ver [modelo](model.md#delta).

## Límites actuales

- No hay reglas a nivel de símbolo ni de carpeta agregada.
- No hay `ignore` por línea ni baseline separado; la deuda se reconoce por comparación con base.
- Los globs no entienden el alias `@/` de TypeScript: se aplican a rutas ya resueltas del árbol.
- Las reglas no modifican el código ni generan arreglos.
