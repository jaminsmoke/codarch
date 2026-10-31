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
  parseGuidePath,
  summarizeDays,
  guideRoute,
  type GuideData,
  type GuideRoute
} from "../lib/guide";
import { localeOf } from "../lib/i18n";
import Marco from "../Marco";
import Future from "../react-pages/Future";
import Guide from "../react-pages/Guide";
import Rules from "../react-pages/Rules";

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
const Timeline = lazy(() => import("./Timeline"));

/** Las fechas de la guía, en orden: lo que sabe el parser de rutas. */
function datesOf(datos: GuideData): string[] {
  return datos.days.map((day) => day.date);
}

export default function GuideApp({ datos, lang = "es" }: { datos: GuideData; lang?: string }) {
  const locale = localeOf(lang);
  const dias = summarizeDays(datos.days);
  const ultima = datos.days.at(-1)?.date ?? "";
  const dates = useMemo(() => datesOf(datos), [datos]);
  const [path, setRoute] = useState<GuideRoute>(() =>
    parseGuidePath(
      typeof window === "undefined"
        ? "/desarrollo/guia/"
        : window.location.pathname,
      dates,
      locale
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
      setRoute(parseGuidePath(window.location.pathname, dates, locale));
      pendiente.current = window.location.hash
        ? decodeURIComponent(window.location.hash.slice(1))
        : null;
      setVisita((n) => n + 1);
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, [dates, locale]);

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
      canonical.href = `${SITIO}${BASE}${guideRoute(path, ultima, locale)}`;
    }
  }, [visita, path, ultima, locale]);

  const navegar = (destino: string): void => {
    const url = new URL(destino, window.location.href);
    pendiente.current = url.hash
      ? decodeURIComponent(url.hash.slice(1))
      : null;
    history.pushState({}, "", `${url.pathname}${url.hash}`);
    setRoute(parseGuidePath(url.pathname, dates, locale));
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
    if (!href.startsWith(`${BASE}${locale === "en" ? "/en" : ""}/desarrollo/guia`)) {
      return;
    }

    evento.preventDefault();
    navegar(href);
  };

  const activo = path.kind === "day" ? path.date : path.kind;
  const day =
    path.kind === "day"
      ? datos.days.find((d) => d.date === path.date) ?? datos.days.at(-1)
      : undefined;

  return (
    <div onClick={alClick}>
      <Marco lang={lang}>
        <Suspense
          fallback={<div className="h-[3.8rem] border-t border-line/70" />}
        >
          <Timeline days={dias} active={activo} lang={lang} />
        </Suspense>
        <AnimatePresence mode="wait">
          <motion.div
            key={visita}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
          >
          {path.kind === "day" && day ? (
            <Guide
              day={day}
              days={dias}
              isLast={day.date === ultima}
              lang={lang}
            />
          ) : null}
          {path.kind === "future" ? (
            <Future upcoming={datos.upcoming} days={dias} lang={lang} />
          ) : null}
          {path.kind === "rules" ? <Rules rules={datos.rules} lang={lang} /> : null}
        </motion.div>
      </AnimatePresence>
      </Marco>
    </div>
  );
}
