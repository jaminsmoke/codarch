import { AnimatePresence, motion } from "motion/react";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent
} from "react";
import {
  parseRutaGuia,
  resumenDias,
  rutaGuia,
  type DatosGuia,
  type RutaGuia
} from "../lib/guia";
import { idiomaDe } from "../lib/i18n";
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

/** La línea del tiempo se carga solo en la guía. */
const LineaTiempo = lazy(() => import("./LineaTiempo"));

/** Las fechas de la guía, en orden: lo que sabe el parser de rutas. */
function fechasDe(datos: DatosGuia): string[] {
  return datos.dias.map((dia) => dia.fecha);
}

export default function GuiaApp({ datos, lang = "es" }: { datos: DatosGuia; lang?: string }) {
  const idioma = idiomaDe(lang);
  const dias = resumenDias(datos.dias);
  const ultima = datos.dias.at(-1)?.fecha ?? "";
  const fechas = useMemo(() => fechasDe(datos), [datos]);
  const [ruta, setRuta] = useState<RutaGuia>(() =>
    parseRutaGuia(
      typeof window === "undefined"
        ? "/desarrollo/guia/"
        : window.location.pathname,
      fechas,
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
      setRuta(parseRutaGuia(window.location.pathname, fechas, idioma));
      pendiente.current = window.location.hash
        ? decodeURIComponent(window.location.hash.slice(1))
        : null;
      setVisita((n) => n + 1);
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, [fechas, idioma]);

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
      canonical.href = `${SITIO}${BASE}${rutaGuia(ruta, ultima, idioma)}`;
    }
  }, [visita, ruta, ultima, idioma]);

  const navegar = (destino: string): void => {
    const url = new URL(destino, window.location.href);
    pendiente.current = url.hash
      ? decodeURIComponent(url.hash.slice(1))
      : null;
    history.pushState({}, "", `${url.pathname}${url.hash}`);
    setRuta(parseRutaGuia(url.pathname, fechas, idioma));
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
    if (!href.startsWith(`${BASE}${idioma === "en" ? "/en" : ""}/desarrollo/guia`)) {
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
      <Marco lang={lang}>
        <Suspense
          fallback={<div className="h-[3.8rem] border-t border-line/70" />}
        >
          <LineaTiempo dias={dias} activo={activo} lang={lang} />
        </Suspense>
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
