import { parseCcJson } from "@codarch/schema";
import {
  CONFIG_VERSION,
  suggestLayers,
  type Suggestion,
  type SuggestedLayer
} from "@codarch/metrics";
import { stringify as toYaml } from "yaml";
import { readJsonFile } from "../io";

/**
 * Propone capas y reglas a partir de un snapshot.
 *
 * Mira el grafo de dependencias y deduce la arquitectura que el código ya
 * tiene: qué carpetas están hacia dentro y cuáles hacia fuera. La salida es un
 * fragmento para `.codarch.yml`; el equipo lo revisa y decide
 * (ADR 0023).
 */
export interface SuggestOptions {
  file?: string;
  json: boolean;
}

export function runSuggest(options: SuggestOptions): number {
  if (!options.file) {
    console.error(
      "falta la ruta del fichero cc.json\n\n  codarch suggest <fichero.cc.json[.gz]>"
    );
    return 1;
  }

  const suggestion = loadSuggestion(options.file);
  if (!suggestion) return 1;

  if (options.json) {
    console.log(JSON.stringify(jsonOf(suggestion), null, 2));
    return 0;
  }

  printSuggestion(suggestion);
  return 0;
}

/** Lee el snapshot y deduce la propuesta; si no puede, lo dice y devuelve null. */
function loadSuggestion(file: string): Suggestion | null {
  try {
    const cc = parseCcJson(readJsonFile(file).json);
    return suggestLayers(cc);
  } catch (error) {
    console.error(`no se pudo leer ${file}: ${(error as Error).message}`);
    return null;
  }
}

/** La propuesta como la consume un script: sin texto alrededor. */
function jsonOf(suggestion: Suggestion): Record<string, unknown> {
  return {
    detected: suggestion.detected,
    layers: suggestion.layers,
    rules: suggestion.rules,
    proposal: suggestion.proposal,
    profile: suggestion.profile,
    ungrouped: suggestion.ungrouped,
    notes: suggestion.notes,
    fits: suggestion.fits
  };
}

/** La propuesta como se lee en la terminal. */
function printSuggestion(suggestion: Suggestion): void {
  console.log("");
  console.log("  CodArch · propuesta de capas");
  console.log("");

  if (suggestion.layers.length === 0) {
    console.log("  No se ha encontrado ninguna carpeta con código.");
    printNotes(suggestion.notes);
    console.log("");
    return;
  }

  printDetected(suggestion.detected);
  printProposal(suggestion);
  printFits(suggestion.fits);
  printNotes(suggestion.notes);
  console.log("");
  console.log(
    "  Las reglas salen como aviso: consultan, no bloquean. Revísalas y súbelas a \"error\" si encajan."
  );
  console.log("");
}

/** Las capas que el código ya tiene, con su tamaño y quién depende de ellas. */
function printDetected(layers: readonly SuggestedLayer[]): void {
  for (const layer of layers) {
    // Una capa puede tener un solo fichero: el recuento es de ficheros, no de
    // aristas, así que hay que decirlo en singular.
    const files = `${layer.files} ${layer.files === 1 ? "fichero" : "ficheros"}`;
    const usedBy =
      layer.usedBy.length > 0
        ? ` · de aquí dependen: ${layer.usedBy.join(", ")}`
        : "";
    console.log(
      `  ${layer.name} · ${files} · nivel ${layer.depth}${usedBy}`
    );
  }
  console.log("");
}

/** El fragmento para `.codarch.yml`, con la línea que dice de dónde sale. */
function printProposal(suggestion: Suggestion): void {
  const yaml = toYaml(
    {
      version: CONFIG_VERSION,
      layers: suggestion.layers.map((layer) => ({
        name: layer.name,
        paths: layer.patterns
      })),
      rules: suggestion.rules
    },
    { lineWidth: 0 }
  );

  console.log("  Propuesta para .codarch.yml:");
  console.log("");
  console.log(
    suggestion.proposal === "profile" && suggestion.profile
      ? `    # Propuesta a partir del perfil "${suggestion.profile}" del catálogo.`
      : "    # Propuesta deducida del grafo de dependencias del repo."
  );
  console.log(
    yaml
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n")
      .trimEnd()
  );
  console.log("");
}

/** Qué perfiles del catálogo encajan, y qué reglas del mejor incumple el repo. */
function printFits(fits: Suggestion["fits"]): void {
  const best = fits[0];
  if (!best || best.matched === 0) return;

  console.log("  Encaje con el catálogo de perfiles:");
  console.log("");
  for (const fit of fits.filter((entry) => entry.matched > 0)) {
    console.log(
      `    ${fit.id.padEnd(12)} ${fit.matched} de ${fit.total} capas · cubre el ${fit.coverage}% del código`
    );
  }
  console.log("");

  if (best.broken.length === 0) return;
  const rules = `${best.broken.length} ${
    best.broken.length === 1 ? "regla" : "reglas"
  }`;
  console.log(`  Con el perfil "${best.id}", el código incumple hoy ${rules}:`);
  for (const message of best.broken) console.log(`    · ${message}`);
  console.log("");
}

/** Los avisos del generador, uno por línea. */
function printNotes(notes: readonly string[]): void {
  for (const note of notes) console.log(`  ${note}`);
}
