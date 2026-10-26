/**
 * Un nombre de fichero, partido para la cabecera de la ficha.
 *
 * Los nombres de este producto no llevan espacios: sin una pista, el navegador
 * parte «CollapsibleSection.tsx» por donde toque y deja «sx» colgando. El punto
 * de la extensión es el sitio natural del salto, así que se separa y la cabecera
 * lo marca con `<wbr>`: la línea solo parte ahí cuando hace falta.
 */
export interface SplitFileName {
  /** El nombre sin la extensión. */
  base: string;
  /** La extensión con su punto; vacía si no hay. */
  ext: string;
}

export function splitFileName(name: string): SplitFileName {
  const dot = name.lastIndexOf(".");
  // Un nombre oculto (`.gitignore`) o un punto final no dan extensión.
  if (dot <= 0 || dot === name.length - 1) return { base: name, ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}
