/**
 * La banda que decide qué día de la guía se está leyendo.
 *
 * La cabecera es pegajosa: lo que queda por debajo de ella es lo que el
 * visitante ve. Se usa su borde inferior, no un porcentaje del viewport, para
 * que el día activo coincida con el que deja `scrollIntoView`.
 */
export function bandaDeLectura(
  cabeceraAbajo: number | null,
  viewport: number
): number {
  return cabeceraAbajo === null ? viewport * 0.32 : cabeceraAbajo + 16;
}

/**
 * El último paso que ya cruzó la banda; si ninguno, el primero.
 *
 * Los pasos llegan en orden de página. Un `top` que no se pudo medir se queda
 * fuera con `Infinity`.
 */
export function pasoEnBanda(
  pasos: readonly { clave: string; top: number }[],
  banda: number,
  primero: string
): string {
  let actual = primero;
  for (const paso of pasos) {
    if (paso.top <= banda) actual = paso.clave;
  }
  return actual;
}
