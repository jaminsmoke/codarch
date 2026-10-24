import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { resumenDias, rutaDia, type DatosGuia } from "../lib/guia";
import { idiomaDe, t } from "../lib/i18n";
import Marco from "../Marco";
import Futuro from "../react-pages/Futuro";
import Guia from "../react-pages/Guia";
import Normas from "../react-pages/Normas";

/**
 * La guía como una sola isla (ADR 0047).
 *
 * La cabecera y la línea del tiempo se montan una vez y no se vuelven a
 * montar al cambiar de día: solo cambia el contenido de abajo. La URL se
 * mueve con `history.pushState`, así que cada día sigue teniendo la suya.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const SITIO = "https://jaminsmoke.github.io";

type Ruta =
  | { tipo: "dia"; fecha: string }
  | { tipo: "futuro" }
  | { tipo: "normas" };

/** La ruta de la guía que dice el navegador. */
function parseRuta(
  pathname: string,
  datos: DatosGuia,
  idioma: string
): Ruta {
  const limpio = pathname.startsWith(BASE)
    ? pathname.slice(BASE.length)
    : pathname;
  const crudo = limpio.split("/").filter(Boolean);
  const partes =
    idioma === "en" && crudo[0] === "en" ? crudo.slice(1) : crudo;
  const ultima = datos.dias.at(-1)?.fecha ?? "";

  if (partes[0] !== "guia") return { tipo: "dia", fecha: ultima };
  const resto = partes.slice(1);
  if (resto[0] === "futuro") return { tipo: "futuro" };
  if (resto[0] === "normas") return { tipo: "normas" };
  const fecha = resto[0];
  if (fecha && datos.dias.some((dia) => dia.fecha === fecha)) {
    return { tipo: "dia", fecha };
  }
  return { tipo: "dia", fecha: ultima };
}

/** La ruta canónica de una vista. */
function rutaDe(ruta: Ruta, ultima: string, idioma: string): string {
  const prefijo = idioma === "en" ? "/en" : "";
  if (ruta.tipo === "futuro") return `${prefijo}/guia/futuro/`;
  if (ruta.tipo === "normas") return `${prefijo}/guia/normas/`;
  return rutaDia(ruta.fecha, ultima, idioma);
}

export default function GuiaApp({ datos, lang = "es" }: { datos: DatosGuia; lang?: string }) {
  const idioma = idiomaDe(lang);
  const dias = resumenDias(datos.dias);
  const ultima = datos.dias.at(-1)?.fecha ?? "";
  const [ruta, setRuta] = useState<Ruta>(() =>
    parseRuta(
      typeof window === "undefined" ? "/guia/" : window.location.pathname,
      datos,
      idioma
    )
  );
  const [visita, setVisita] = useState(0);
  const pendiente = useRef<string | null>(
    typeof window !== "undefined" && window.location.hash
      ? decodeURIComponent(window.location.hash.slice(1))
      : null
  );

  useEffect(() => {
    const alVolver = (): void => {
      setRuta(parseRuta(window.location.pathname, datos, idioma));
      pendiente.current = window.location.hash
        ? decodeURIComponent(window.location.hash.slice(1))
        : null;
      setVisita((n) => n + 1);
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, [datos, idioma]);

  useEffect(() => {
    const id = pendiente.current;
    pendiente.current = null;
    if (id) {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );
    if (canonical) {
      canonical.href = `${SITIO}${BASE}${rutaDe(ruta, ultima, idioma)}`;
    }
  }, [visita, ruta, ultima, idioma]);

  const navegar = (destino: string): void => {
    const url = new URL(destino, window.location.href);
    pendiente.current = url.hash
      ? decodeURIComponent(url.hash.slice(1))
      : null;
    history.pushState({}, "", `${url.pathname}${url.hash}`);
    setRuta(parseRuta(url.pathname, datos, idioma));
    setVisita((n) => n + 1);
  };

  const alClick = (evento: MouseEvent<HTMLDivElement>): void => {
    if (evento.defaultPrevented || evento.button !== 0) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
      return;
    }

    const ancla = (evento.target as HTMLElement).closest("a");
    if (!ancla || ancla.target === "_blank" || ancla.hasAttribute("download")) {
      return;
    }

    const href = ancla.getAttribute("href");
    if (!href || href.startsWith("#")) return;
    if (!href.startsWith(`${BASE}${idioma === "en" ? "/en" : ""}/guia`)) {
      return;
    }

    evento.preventDefault();
    navegar(href);
  };

  const activo = ruta.tipo === "dia" ? ruta.fecha : ruta.tipo;
  const dia =
    ruta.tipo === "dia"
      ? datos.dias.find((d) => d.fecha === ruta.fecha) ?? datos.dias.at(-1)
      : undefined;

  return (
    <div onClick={alClick}>
      <Marco dias={dias} activo={activo} lang={lang}>
        {idioma === "en" ? (
          <div className="mx-auto w-full max-w-5xl px-5 pt-6">
            <p className="rounded-card border border-line bg-panel px-4 py-2 text-sm text-muted">
              {t(idioma, "guia.aviso")}
            </p>
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.div
            key={visita}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          >
          {ruta.tipo === "dia" && dia ? (
            <Guia
              dia={dia}
              dias={dias}
              esUltimo={dia.fecha === ultima}
              lang={lang}
            />
          ) : null}
          {ruta.tipo === "futuro" ? (
            <Futuro futuras={datos.futuras} dias={dias} lang={lang} />
          ) : null}
          {ruta.tipo === "normas" ? <Normas normas={datos.normas} lang={lang} /> : null}
        </motion.div>
      </AnimatePresence>
      </Marco>
    </div>
  );
}
