import type { DatosGuia } from "../lib/guia";
import Marco from "../Marco";
import Guia from "../react-pages/Guia";
import Inicio from "../react-pages/Inicio";

/**
 * La portada y la guía siguen en React (ADR 0046).
 *
 * Starlight se queda con los documentos; estas dos páginas conservan el marco
 * y la identidad que ya tenía la web. La guía recibe sus entradas ya
 * preparadas desde Astro: el navegador no parte ningún markdown.
 */

interface Props {
  pagina: "inicio" | "guia";
  guia?: DatosGuia;
}

export default function ReactSite({ pagina, guia }: Props) {
  return (
    <Marco dias={pagina === "guia" && guia ? guia.dias : undefined}>
      {pagina === "guia" && guia ? <Guia datos={guia} /> : <Inicio />}
    </Marco>
  );
}
