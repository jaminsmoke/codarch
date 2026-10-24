import fs from "node:fs";
import path from "node:path";

/**
 * Deja una entrada en el `.gitignore` del repositorio, sin tocar el resto.
 *
 * CodArch la usa para `.codarch/`: el estado del análisis es local y no se
 * versiona. Solo se llama cuando el directorio se crea por primera vez; si el
 * usuario quita la línea, no vuelve (ADR 0050).
 */
export function ensureGitignoreEntry(root: string, entry: string): boolean {
  const wanted = entry.trim();
  if (!wanted) return false;
  const file = path.join(root, ".gitignore");

  let content = "";
  try {
    if (fs.existsSync(file)) content = fs.readFileSync(file, "utf8");
  } catch {
    return false;
  }

  const lines = content.split(/\r?\n/).map((line) => line.trim());
  // `.codarch/` y `.codarch` dicen lo mismo para git: cualquiera vale.
  const present = lines.some(
    (line) => line === wanted || line === wanted.replace(/\/$/, "")
  );
  if (present) return false;

  try {
    const suffix = content.length === 0 || content.endsWith("\n") ? "" : "\n";
    fs.writeFileSync(file, `${content}${suffix}${wanted}\n`, "utf8");
    return true;
  } catch {
    return false;
  }
}
