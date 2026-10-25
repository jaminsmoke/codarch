/**
 * El título de la ventana.
 *
 * Manda el nombre del proyecto —el del snapshot— cuando se conoce: es lo que
 * el usuario llama «su proyecto», no la carpeta donde cayó el clon. Si aún no
 * hay snapshot, se queda el último segmento de la ruta: entera no cabe y no
 * hace falta. Las barras finales se ignoran, porque hay diálogos de Linux que
 * devuelven la carpeta con ellas.
 */
export function documentTitle(
  label: string | null,
  projectName?: string | null
): string {
  const named = projectName?.trim();
  if (named) return `CodArch · ${named}`;
  if (!label) return "CodArch";
  const trimmed = label.replace(/[\\/]+$/, "");
  const name = trimmed.split(/[\\/]/).pop();
  return `CodArch · ${name || label}`;
}
