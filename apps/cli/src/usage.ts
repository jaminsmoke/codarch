/**
 * La ayuda de la CLI.
 *
 * Es un texto largo y cambia poco: vive aparte para que el despacho de comandos
 * se lea de un tirón y para que un `--help` no arrastre nada más.
 */

/** La ayuda, impresa, con el código de salida de quien solo venía a leerla. */
export function showUsage(): 0 {
  console.log(USAGE);
  return 0;
}

export const USAGE = `
CodArch · mapa vivo de la arquitectura de tu software

Uso:
  codarch analyze [ruta] [opciones]
  codarch inspect <fichero.cc.json[.gz]> [opciones]
  codarch render  <fichero.cc.json[.gz]> [opciones]
  codarch diff    <base.cc.json[.gz]> <head.cc.json[.gz]> [opciones]
  codarch serve   [ruta] [opciones]
  codarch profiles [--json]
  codarch suggest <fichero.cc.json[.gz]> [--json]
  codarch history [ruta] [--json]
  codarch scopes  [ruta] [--json]
  codarch chain   [símbolo] [opciones]
  codarch verify  [--root <ruta>] [--json]
  codarch addons  [list|add|remove] [ruta|nombre] [--json]
  codarch plugins [list|add|remove] [ruta|nombre] [--json]
  codarch version [--check] [--json]

Opciones de analyze:
  -o, --out <dir>    directorio de salida (por defecto <ruta>/.codarch)
  --ignore <patrón>  sumar una exclusión al alcance (repetible)
  --config <file>    alcance YAML (por defecto .codarch.yml si existe)
  --no-config        no leer el alcance del YAML
  --project <nombre> nombre del proyecto en el snapshot
  --no-git           no leer churn del historial git
  --history          guardar la foto en el historial del repo (.codarch-history/)
  -h, --help         esta ayuda
  -v, --version      versión

Opciones de inspect:
  --json            salida machine-readable
  --top <n>         número de ficheros en el ranking (por defecto 5)
  --metric <nombre> métrica del ranking (por defecto rloc)
  -h, --help        esta ayuda
  -v, --version     versión

Opciones de render:
  -o, --out <dir>   carpeta de salida (por defecto, junto al cc.json)
  -h, --help        esta ayuda

Opciones de diff:
  -o, --out <file>  escribe el reporte JSON (sin esto no se escribe fichero)
  --top <n>         hotspots en el reporte (por defecto 10)
  --hotspot-metric <métrica>  por defecto maxComplexity, luego rloc
  --config <file>   reglas YAML (por defecto .codarch.yml si existe)
  --no-config       no cargar reglas
  --fail-on <modo>  none | cycles | violations | hotspots | any (por defecto none)
  -h, --help        esta ayuda

Opciones de serve:
  -p, --port <n>    puerto local (por defecto 4173)
  --host <host>     interfaz (por defecto 127.0.0.1)
  --watch           reanaliza al cambiar ficheros y refresca por SSE (por defecto)
  --no-watch        solo analiza al arrancar
  --no-web          modo API sin servir la app (para Vite u otro frontend)
  -h, --help        esta ayuda

Opciones de profiles:
  --json            salida machine-readable
  -h, --help        esta ayuda

Opciones de suggest:
  --json            salida machine-readable
  -h, --help        esta ayuda

Opciones de verify:
  --root <ruta>    el repositorio (por defecto, el actual)
  --json            salida machine-readable
  -h, --help        esta ayuda

Opciones de chain:
  --json            salida machine-readable
  --rebuild         rehace el libro mayor aunque esté en caché
  -h, --help        esta ayuda

Opciones de addons:
  list              los addons de addons/ y cuáles declara el repo
  add <ruta>        copia un addon a addons/ y lo declara en .codarch.yml
  remove <nombre>   lo quita del repo y de la declaración
  --root <ruta>     el repositorio (por defecto, el actual)
  --json            salida machine-readable
  -h, --help        esta ayuda

Opciones de plugins:
  list              los plugins de plugins/ y cuáles declara el repo
  add <ruta>        copia un plugin a plugins/ y lo declara en .codarch.yml
  remove <nombre>   lo quita del repo y de la declaración
  --root <ruta>     el repositorio (por defecto, el actual)
  --json            salida machine-readable
  -h, --help        esta ayuda

Opciones de version:
  --check           pregunta en npm si hay una versión más nueva
  --json            salida machine-readable
  -h, --help        esta ayuda

Opciones de history:
  --from <foto>     foto con la que comparar (fecha o checksum)
  --to <foto>       foto contra la que comparar
  -o, --out <file>  escribe el reporte JSON del diff (sin esto, no se escribe)
  --json            salida machine-readable
  -h, --help        esta ayuda

Opciones de scopes:
  --root <ruta>     la raíz que se mira (por defecto, la actual)
  --json            salida machine-readable
  -h, --help        esta ayuda

Ejemplos:
  codarch analyze .
  codarch analyze . -o .codarch --project "Mi proyecto"
  codarch inspect samples/codecharta_visualization.cc.json.gz
  codarch render samples/codecharta_visualization.cc.json.gz
  codarch render mapa.cc.json -o publico
  codarch diff base.cc.json head.cc.json -o report.json --fail-on cycles
  codarch serve .
  codarch serve . --no-watch
  codarch profiles
  codarch suggest .codarch/snapshot.cc.json
`;
