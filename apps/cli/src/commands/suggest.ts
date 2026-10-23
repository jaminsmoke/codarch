import { parseCcJson } from "@codarch/schema";
import {
  CONFIG_VERSION,
  suggestLayers,
  type Suggestion
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

  let loaded;
  try {
    loaded = readJsonFile(options.file);
  } catch (error) {
    console.error(`no se pudo leer ${options.file}: ${(error as Error).message}`);
    return 1;
  }

  let suggestion: Suggestion;
  try {
    const cc = parseCcJson(loaded.json);
    suggestion = suggestLayers(cc);
  } catch (error) {
    console.error(`no se pudo leer ${options.file}: ${(error as Error).message}`);
    return 1;
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          detected: suggestion.detected,
          layers: suggestion.layers,
          rules: suggestion.rules,
          proposal: suggestion.proposal,
          profile: suggestion.profile,
          ungrouped: suggestion.ungrouped,
          notes: suggestion.notes,
          fits: suggestion.fits
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log("");
  console.log("  CodArch · propuesta de capas");
  console.log("");
  if (suggestion.layers.length === 0) {
    console.log("  No se ha encontrado ninguna carpeta con código.");
    for (const note of suggestion.notes) console.log(`  ${note}`);
    console.log("");
    return 0;
  }

  for (const layer of suggestion.detected) {
    console.log(
      `  ${layer.name} · ${layer.files} ficheros · nivel ${layer.depth}` +
        (layer.usedBy.length > 0
          ? ` · de aquí dependen: ${layer.usedBy.join(", ")}`
          : "")
    );
  }
  console.log("");

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

  const best = suggestion.fits[0];
  if (best && best.matched > 0) {
    console.log("  Encaje con el catálogo de perfiles:");
    console.log("");
    for (const fit of suggestion.fits.filter((entry) => entry.matched > 0)) {
      console.log(
        `    ${fit.id.padEnd(12)} ${fit.matched} de ${fit.total} capas · cubre el ${fit.coverage}% del código`
      );
    }
    console.log("");
    if (best.broken.length > 0) {
      console.log(
        `  Con el perfil "${best.id}", el código incumple hoy ${best.broken.length} ${
          best.broken.length === 1 ? "regla" : "reglas"
        }:`
      );
      for (const message of best.broken) console.log(`    · ${message}`);
      console.log("");
    }
  }
  for (const note of suggestion.notes) console.log(`  ${note}`);
  console.log("");
  console.log(
    "  Las reglas salen como aviso: consultan, no bloquean. Revísalas y súbelas a \"error\" si encajan."
  );
  console.log("");
  return 0;
}
