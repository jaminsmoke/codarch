#!/usr/bin/env node
import { runAnalyze, type AnalyzeCommandOptions } from "./commands/analyze";
import { runDiff, type DiffCommandOptions, type FailOn } from "./commands/diff";
import { runInspect, type InspectOptions } from "./commands/inspect";
import { runRender, type RenderCommandOptions } from "./commands/render";
import { runServe, type ServeOptions } from "./commands/serve";
import { runProfiles } from "./commands/profiles";
import { runSuggest, type SuggestOptions } from "./commands/suggest";

declare const __CODARCH_VERSION__: string | undefined;

const VERSION =
  typeof __CODARCH_VERSION__ === "string" ? __CODARCH_VERSION__ : "0.0.0";

const USAGE = `
CodArch · mapa vivo de la arquitectura de tu software

Uso:
  codarch analyze [ruta] [opciones]
  codarch inspect <fichero.cc.json[.gz]> [opciones]
  codarch render  <fichero.cc.json[.gz]> [opciones]
  codarch diff    <base.cc.json[.gz]> <head.cc.json[.gz]> [opciones]
  codarch serve   [ruta] [opciones]
  codarch profiles [--json]
  codarch suggest <fichero.cc.json[.gz]> [--json]

Opciones de analyze:
  -o, --out <dir>    directorio de salida (por defecto <ruta>/.codarch)
  --ignore <patrón>  excluir rutas (repetible)
  --project <nombre> nombre del proyecto en el snapshot
  --title <texto>    título del mapa
  --no-git           no leer churn del historial git
  -h, --help         esta ayuda
  -v, --version      versión

Opciones de inspect:
  --json            salida machine-readable
  --top <n>         número de ficheros en el ranking (por defecto 5)
  --metric <nombre> métrica del ranking (por defecto rloc)
  -h, --help        esta ayuda
  -v, --version     versión

Opciones de render:
  -o, --out <html>  fichero de salida (por defecto, junto al cc.json)
  --area <métrica>  métrica que decide el área (por defecto rloc)
  --color <modo>    risk | structure | <métrica> (por defecto risk)
  --title <texto>   título del proyecto en el mapa
  -h, --help        esta ayuda

Opciones de diff:
  -o, --out <file>  reporte JSON (por defecto report.json)
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

Ejemplos:
  codarch analyze .
  codarch analyze . -o .codarch --title "Mi proyecto"
  codarch inspect samples/codecharta_visualization.cc.json.gz
  codarch render samples/codecharta_visualization.cc.json.gz
  codarch render mapa.cc.json -o mapa.html --area rloc --color maxComplexity
  codarch diff base.cc.json head.cc.json -o report.json --fail-on cycles
  codarch serve .
  codarch serve . --no-watch
  codarch profiles
  codarch suggest .codarch/snapshot.cc.json
`;

function parseAnalyze(args: string[]): AnalyzeCommandOptions | number {
  const options: AnalyzeCommandOptions = { help: false, ignore: [] };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index] as string;

    if (arg === "--out" || arg === "-o") {
      const value = args[++index];
      if (!value) {
        console.error("--out necesita una ruta");
        return 1;
      }
      options.out = value;
    } else if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
    } else if (arg === "--ignore") {
      const value = args[++index];
      if (!value) {
        console.error("--ignore necesita un patrón");
        return 1;
      }
      options.ignore?.push(value);
    } else if (arg.startsWith("--ignore=")) {
      options.ignore?.push(arg.slice("--ignore=".length));
    } else if (arg === "--project") {
      const value = args[++index];
      if (!value) {
        console.error("--project necesita un nombre");
        return 1;
      }
      options.projectName = value;
    } else if (arg.startsWith("--project=")) {
      options.projectName = arg.slice("--project=".length);
    } else if (arg === "--title") {
      const value = args[++index];
      if (!value) {
        console.error("--title necesita un texto");
        return 1;
      }
      options.title = value;
    } else if (arg.startsWith("--title=")) {
      options.title = arg.slice("--title=".length);
    } else if (arg === "--no-git") {
      options.git = false;
    } else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      return 0;
    } else if (arg === "--version" || arg === "-v") {
      console.log(VERSION);
      return 0;
    } else if (arg.startsWith("-")) {
      console.error(`opción desconocida: ${arg}`);
      return 1;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    console.error(`sobra un argumento: ${positional[1]}`);
    return 1;
  }

  options.root = positional[0] ?? ".";
  return options;
}

function parseSuggest(args: string[]): SuggestOptions | number {
  const options: SuggestOptions = { json: false };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index] as string;

    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      return 0;
    } else if (arg.startsWith("-")) {
      console.error(`opción desconocida: ${arg}`);
      return 1;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    console.error(`sobra un argumento: ${positional[1]}`);
    return 1;
  }

  options.file = positional[0];
  return options;
}

function parseInspect(args: string[]): InspectOptions | number {
  const options: InspectOptions = { json: false, top: 5, help: false };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index] as string;

    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--top") {
      const value = args[++index];
      const parsed = Number(value);
      if (!value || !Number.isInteger(parsed) || parsed < 1) {
        console.error("--top necesita un entero positivo");
        return 1;
      }
      options.top = parsed;
    } else if (arg.startsWith("--top=")) {
      const parsed = Number(arg.slice("--top=".length));
      if (!Number.isInteger(parsed) || parsed < 1) {
        console.error("--top necesita un entero positivo");
        return 1;
      }
      options.top = parsed;
    } else if (arg === "--metric") {
      const value = args[++index];
      if (!value) {
        console.error("--metric necesita un nombre");
        return 1;
      }
      options.metric = value;
    } else if (arg.startsWith("--metric=")) {
      options.metric = arg.slice("--metric=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      return 0;
    } else if (arg === "--version" || arg === "-v") {
      console.log(VERSION);
      return 0;
    } else if (arg.startsWith("-")) {
      console.error(`opción desconocida: ${arg}`);
      return 1;
    } else {
      positional.push(arg);
    }
  }

  options.file = positional[0];
  return options;
}

function parseRender(args: string[]): RenderCommandOptions | number {
  const options: RenderCommandOptions = { help: false };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index] as string;

    if (arg === "--out" || arg === "-o") {
      const value = args[++index];
      if (!value) {
        console.error("--out necesita una ruta");
        return 1;
      }
      options.out = value;
    } else if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
    } else if (arg === "--area") {
      const value = args[++index];
      if (!value) {
        console.error("--area necesita un nombre de métrica");
        return 1;
      }
      options.area = value;
    } else if (arg.startsWith("--area=")) {
      options.area = arg.slice("--area=".length);
    } else if (arg === "--color") {
      const value = args[++index];
      if (!value) {
        console.error("--color necesita risk, structure o una métrica");
        return 1;
      }
      options.color = value;
    } else if (arg.startsWith("--color=")) {
      options.color = arg.slice("--color=".length);
    } else if (arg === "--title") {
      const value = args[++index];
      if (!value) {
        console.error("--title necesita un texto");
        return 1;
      }
      options.title = value;
    } else if (arg.startsWith("--title=")) {
      options.title = arg.slice("--title=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      return 0;
    } else if (arg === "--version" || arg === "-v") {
      console.log(VERSION);
      return 0;
    } else if (arg.startsWith("-")) {
      console.error(`opción desconocida: ${arg}`);
      return 1;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    console.error(`sobra un argumento: ${positional[1]}`);
    return 1;
  }

  options.file = positional[0];
  return options;
}

function parseDiff(args: string[]): DiffCommandOptions | number {
  const options: DiffCommandOptions = { help: false, top: 10, failOn: "none" };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index] as string;

    if (arg === "--out" || arg === "-o") {
      const value = args[++index];
      if (!value) {
        console.error("--out necesita una ruta");
        return 1;
      }
      options.out = value;
    } else if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
    } else if (arg === "--top") {
      const value = args[++index];
      const parsed = Number(value);
      if (!value || !Number.isInteger(parsed) || parsed < 1) {
        console.error("--top necesita un entero positivo");
        return 1;
      }
      options.top = parsed;
    } else if (arg.startsWith("--top=")) {
      const parsed = Number(arg.slice("--top=".length));
      if (!Number.isInteger(parsed) || parsed < 1) {
        console.error("--top necesita un entero positivo");
        return 1;
      }
      options.top = parsed;
    } else if (arg === "--hotspot-metric") {
      const value = args[++index];
      if (!value) {
        console.error("--hotspot-metric necesita un nombre");
        return 1;
      }
      options.hotspotMetric = value;
    } else if (arg.startsWith("--hotspot-metric=")) {
      options.hotspotMetric = arg.slice("--hotspot-metric=".length);
    } else if (arg === "--config") {
      const value = args[++index];
      if (!value) {
        console.error("--config necesita una ruta");
        return 1;
      }
      options.config = value;
    } else if (arg.startsWith("--config=")) {
      options.config = arg.slice("--config=".length);
    } else if (arg === "--no-config") {
      options.noConfig = true;
    } else if (arg === "--fail-on") {
      const value = args[++index];
      if (!isFailOn(value)) {
        console.error(
          "--fail-on necesita none, cycles, violations, hotspots o any"
        );
        return 1;
      }
      options.failOn = value;
    } else if (arg.startsWith("--fail-on=")) {
      const value = arg.slice("--fail-on=".length);
      if (!isFailOn(value)) {
        console.error(
          "--fail-on necesita none, cycles, violations, hotspots o any"
        );
        return 1;
      }
      options.failOn = value;
    } else if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      return 0;
    } else if (arg === "--version" || arg === "-v") {
      console.log(VERSION);
      return 0;
    } else if (arg.startsWith("-")) {
      console.error(`opción desconocida: ${arg}`);
      return 1;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) {
    console.error("diff necesita exactamente dos snapshots: base y head");
    return 1;
  }

  options.base = positional[0];
  options.head = positional[1];
  return options;
}

function isFailOn(value: string | undefined): value is FailOn {
  return (
    value === "none" ||
    value === "cycles" ||
    value === "violations" ||
    value === "hotspots" ||
    value === "any"
  );
}

function parseServe(args: string[]): ServeOptions | number {
  const options: ServeOptions = {
    port: 4173,
    host: "127.0.0.1",
    watch: true,
    web: true,
    help: false
  };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index] as string;

    if (arg === "--port" || arg === "-p") {
      const value = args[++index];
      const port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error("--port necesita un número entre 1 y 65535");
        return 1;
      }
      options.port = port;
    } else if (arg.startsWith("--port=")) {
      const port = Number(arg.slice("--port=".length));
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error("--port necesita un número entre 1 y 65535");
        return 1;
      }
      options.port = port;
    } else if (arg === "--host") {
      const value = args[++index];
      if (!value) {
        console.error("--host necesita un valor");
        return 1;
      }
      options.host = value;
    } else if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
    } else if (arg === "--watch") {
      options.watch = true;
    } else if (arg === "--no-watch") {
      options.watch = false;
    } else if (arg === "--no-web") {
      options.web = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg.startsWith("-")) {
      console.error(`opción desconocida en serve: ${arg}`);
      return 1;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    console.error("serve acepta como máximo una ruta");
    return 1;
  }
  options.root = positional[0];
  return options;
}

function main(argv: string[]): number {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h") {
    console.log(USAGE);
    return 0;
  }

  if (command === "--version" || command === "-v") {
    console.log(VERSION);
    return 0;
  }

  if (command === "analyze") {
    const parsed = parseAnalyze(rest);
    if (typeof parsed === "number") return parsed;
    return runAnalyze(parsed);
  }

  if (command === "inspect") {
    const parsed = parseInspect(rest);
    if (typeof parsed === "number") return parsed;
    return runInspect(parsed);
  }

  if (command === "render") {
    const parsed = parseRender(rest);
    if (typeof parsed === "number") return parsed;
    return runRender(parsed);
  }

  if (command === "diff") {
    const parsed = parseDiff(rest);
    if (typeof parsed === "number") return parsed;
    return runDiff(parsed);
  }

  if (command === "serve") {
    const parsed = parseServe(rest);
    if (typeof parsed === "number") return parsed;
    if (parsed.help) {
      console.log(USAGE);
      return 0;
    }
    return runServe(parsed);
  }

  if (command === "profiles") {
    return runProfiles(rest.includes("--json"));
  }

  if (command === "suggest") {
    const parsed = parseSuggest(rest);
    if (typeof parsed === "number") return parsed;
    return runSuggest(parsed);
  }

  console.error(`comando desconocido: ${command}\n${USAGE}`);
  return 1;
}

process.exitCode = main(process.argv.slice(2));
