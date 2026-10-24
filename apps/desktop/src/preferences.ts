import fs from "node:fs";
import path from "node:path";
import { parsePreferences, type ViewPreferences } from "@codarch/ui/storage";

/**
 * Las preferencias de vista de un repositorio (ADR 0053).
 *
 * Viven en `.codarch/preferences.json`, dentro del estado local del repo. La
 * máquina guarda una copia en su `localStorage` como respaldo: si el repo no
 * se puede escribir, la app sigue recordando la vista.
 */
export const PREFERENCES_FILE = "preferences.json";

export function preferencesPath(root: string): string {
  return path.join(root, ".codarch", PREFERENCES_FILE);
}

export function readRepoPreferences(root: string): ViewPreferences | null {
  try {
    const raw = fs.readFileSync(preferencesPath(root), "utf8");
    return parsePreferences(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeRepoPreferences(
  root: string,
  preferences: ViewPreferences
): boolean {
  try {
    const file = preferencesPath(root);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      `${JSON.stringify(preferences, null, 2)}\n`,
      "utf8"
    );
    return true;
  } catch (cause) {
    console.error(
      `no se pudieron guardar las preferencias de ${root}: ${(cause as Error).message}`
    );
    return false;
  }
}
