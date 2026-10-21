import fs from "node:fs";
import path from "node:path";
import {
  loadChains,
  parseCcJson,
  readHistoryIndex,
  verifyChains,
  type CcJson
} from "@codarch/schema";

/**
 * Comprobar que el snapshot encaja con la historia.
 *
 * Cada símbolo del snapshot tiene que ser la última versión de su cadena ✓.
 * Si el hash del cuerpo no es el de la cadena, el snapshot y la historia
 * cuentan historias distintas ✓ (ADR 0026).
 */

export interface VerifyCommandOptions {
  root?: string;
  json: boolean;
  help: boolean;
}

export function runVerify(options: VerifyCommandOptions): number {
  const root = path.resolve(options.root ?? ".");
  const index = readHistoryIndex(root);

  if (index.entries.length === 0) {
    console.error(
      "no hay historial en este repositorio; se guarda con \"codarch analyze . --history\""
    );
    return 1;
  }

  const chains = loadChains(root, index.entries);
  const snapshot = readCurrentSnapshot(root, index.entries[index.entries.length - 1]);
  if (!snapshot) {
    console.error("no hay ningún snapshot que comprobar");
    return 1;
  }

  const result = verifyChains(chains, snapshot);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 2;
  }

  console.log("");
  console.log("  CodArch · comprobación del historial");
  console.log("");

  if (result.ok) {
    console.log(
      `  ✅ Todo encaja: ${result.checked} símbolos cuadran con sus cadenas.`
    );
    console.log(`     Cabeza del proyecto: ${result.projectHead.slice(0, 16)}`);
    console.log("");
    return 0;
  }

  console.log(
    `  ⚠️ ${result.mismatches.length} de ${result.checked} símbolos no cuadran:`
  );
  console.log("");
  for (const mismatch of result.mismatches.slice(0, 10)) {
    console.log(`    · ${mismatch.path} · ${mismatch.name}: ${mismatch.reason}`);
  }
  if (result.mismatches.length > 10) {
    console.log(`    … y ${result.mismatches.length - 10} más`);
  }
  console.log("");
  return 2;
}

/** El snapshot actual, o la última foto si no hay ninguno guardado. */
function readCurrentSnapshot(
  root: string,
  last: { checksum: string } | undefined
): CcJson | null {
  const current = path.join(root, ".codarch", "snapshot.cc.json");
  try {
    return parseCcJson(
      JSON.parse(fs.readFileSync(current, "utf8")) as unknown
    );
  } catch {
    // Puede que no haya snapshot actual.
  }

  if (!last) return null;
  const history = path.join(root, ".codarch-history");
  try {
    const files = fs
      .readdirSync(history)
      .filter((file) => file.endsWith(".cc.json"))
      .sort();
    const lastFile = files[files.length - 1];
    if (!lastFile) return null;
    return parseCcJson(
      JSON.parse(fs.readFileSync(path.join(history, lastFile), "utf8")) as unknown
    );
  } catch {
    return null;
  }
}
