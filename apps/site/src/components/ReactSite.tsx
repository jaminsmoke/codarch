import Marco from "../Marco";
import Inicio from "../react-pages/Inicio";

/**
 * La portada (ADR 0046).
 *
 * Starlight se queda con los documentos; la portada conserva el marco y la
 * identidad que ya tenía la web. La guía tiene su propio componente porque
 * recibe los datos de Astro.
 */
export default function ReactSite() {
  return (
    <Marco>
      <Inicio />
    </Marco>
  );
}
