/**
 * El color de un delta de deuda: subir empeora, bajar mejora, quedarse igual no
 * se pinta. Vive aquí para que la fila no anide ternarios.
 */
export function deltaTone(delta: number): string | undefined {
  if (delta > 0) return "is-worse";
  if (delta < 0) return "is-better";
  return undefined;
}
