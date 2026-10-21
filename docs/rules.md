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

Para usarlo, en `.codarch.yml`:

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
([ADR 0023](adr/0023-lente-de-dominio-por-pasos.md)).

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

Marca los componentes fuertemente conexos de head (tamaño > 1 o self-loop). La clave usa los ids
del componente: un ciclo que cambia de tamaño aparece como uno resuelto y otro introducido.

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
