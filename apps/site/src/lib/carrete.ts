/**
 * La física del carrete de la línea del tiempo de la guía.
 *
 * Al soltar, el gesto no se corta: sigue rodando un tramo con la velocidad que
 * llevaba y frena encajando en la pastilla más cercana (el imán). Las cuentas
 * viven aquí para poder fijarlas con tests; el componente solo las usa.
 */

/** La memoria del gesto, en ms: de aquí sale la velocidad. */
export const VENTANA = 120;

/** La velocidad mayor que se admite, en px/ms. */
const TOPE_VELOCIDAD = 3;

/** Lo que se añade al gesto por cada px/ms de velocidad. */
const MARGEN = 150;

/** El tramo máximo que añade la inercia, en px. */
const TOPE_INERCIA = 280;

export interface Muestra {
  x: number;
  t: number;
}

function limitar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/** La velocidad del final del gesto, en px/ms. */
export function velocidad(muestras: Muestra[]): number {
  const primera = muestras[0];
  const ultima = muestras[muestras.length - 1];
  if (!primera || !ultima || muestras.length < 2) return 0;
  const dt = ultima.t - primera.t;
  if (dt <= 0) return 0;
  return limitar((ultima.x - primera.x) / dt, -TOPE_VELOCIDAD, TOPE_VELOCIDAD);
}

/** Hasta dónde llega el gesto al soltar: lo andado más lo que rueda solo. */
export function proyectar(arrastre: number, rapidez: number): number {
  return arrastre + limitar(rapidez * MARGEN, -TOPE_INERCIA, TOPE_INERCIA);
}

/** El índice que queda más cerca de un centro; el actual si no hay otro. */
export function masCercano(
  centros: number[],
  objetivo: number,
  actual: number
): number {
  let mejor = actual;
  let distancia = Infinity;
  centros.forEach((centro, i) => {
    const suya = Math.abs(centro - objetivo);
    if (suya < distancia) {
      distancia = suya;
      mejor = i;
    }
  });
  return mejor;
}

/** Cuánto tarda el imán en encajar: más recorrido, más tiempo, con tope. */
export function duracionVuelo(distancia: number): number {
  return Math.round(limitar(260 + Math.abs(distancia) * 0.25, 260, 480));
}
