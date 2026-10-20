#!/usr/bin/env node
import { runInspect, type InspectOptions } from "./commands/inspect";
import { runRender, type RenderCommandOptions } from "./commands/render";

const VERSION = "0.0.0";

const USAGE = `
CodArch · mapa vivo de la arquitectura de tu software

Uso:
  codarch inspect <fichero.cc.json[.gz]> [opciones]
  codarch render  <fichero.cc.json[.gz]> [opciones]

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

Ejemplos:
  codarch inspect samples/codecharta_visualization.cc.json.gz
  codarch render samples/codecharta_visualization.cc.json.gz
  codarch render mapa.cc.json -o mapa.html --area rloc --color max_complexity_per_function
`;

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

  console.error(`comando desconocido: ${command}\n${USAGE}`);
  return 1;
}

process.exitCode = main(process.argv.slice(2));
