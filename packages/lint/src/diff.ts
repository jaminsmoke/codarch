/**
 * Un diff de líneas pequeño para la confirmación de una regla.
 *
 * No es un diff completo: recorta el prefijo y el sufijo comunes y muestra el
 * bloque que cambia con `-` y `+`. Para un fichero de config es suficiente y no
 * arrastra una dependencia.
 */
export function lintRuleDiff(before: string, after: string): string {
  if (before === after) return "";
  const left = before.split("\n");
  const right = after.split("\n");
  let start = 0;
  while (start < left.length && left[start] === right[start]) start += 1;
  let leftEnd = left.length;
  let rightEnd = right.length;
  while (
    leftEnd > start &&
    rightEnd > start &&
    left[leftEnd - 1] === right[rightEnd - 1]
  ) {
    leftEnd -= 1;
    rightEnd -= 1;
  }
  const removed = left.slice(start, leftEnd).map((line) => `- ${line}`);
  const added = right.slice(start, rightEnd).map((line) => `+ ${line}`);
  return [...removed, ...added].join("\n");
}
