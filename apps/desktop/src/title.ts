/**
 * El título de la ventana.
 *
 * Lleva el nombre de lo que se está mirando para que la barra de tareas, el
 * lanzador y una captura digan algo. De una ruta se queda el último segmento:
 * entera no cabe y no hace falta. Las barras finales se ignoran, porque hay
 * diálogos de Linux que devuelven la carpeta con ellas.
 */
export function documentTitle(label: string | null): string {
  if (!label) return "CodArch";
  const trimmed = label.replace(/[\\/]+$/, "");
  const name = trimmed.split(/[\\/]/).pop();
  return `CodArch · ${name || label}`;
}
