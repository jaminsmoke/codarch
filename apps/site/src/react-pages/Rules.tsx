import { ArrowLeft } from "lucide-react";
import { localeOf, t } from "../lib/i18n";
import { useTitle } from "../lib/title";

/**
 * Cómo se escribe la guía: la leyenda, las categorías y las reglas.
 *
 * Vive en su propia página para no repetirla en cada día (ADR 0047).
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Rules({
  rules,
  lang = "es"
}: {
  rules: string;
  lang?: string;
}) {
  const locale = localeOf(lang);
  const raiz = locale === "en" ? `${BASE}/en` : BASE;
  useTitle(
    t(locale, "guia.normas.titulo"),
    t(locale, "guia.normas.desc"),
    locale
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <p className="font-mono text-xs tracking-[0.22em] text-rust-ink uppercase">
        {t(locale, "guia.registro")}
      </p>
      <h1 className="font-display mt-2 text-5xl leading-none font-bold tracking-tight">
        {t(locale, "guia.normas.titulo")}
      </h1>
      <p className="mt-4 mb-8 text-lg leading-relaxed text-ink-soft">
        {t(locale, "guia.normas.desc")}
      </p>
      <div
        className="prosa prosa-guia"
        dangerouslySetInnerHTML={{ __html: rules }}
      />
      <a
        href={`${raiz}/desarrollo/guia/`}
        className="mt-10 inline-flex items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.1em] text-rust-ink uppercase no-underline hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-3" />
        {t(locale, "guia.volver")}
      </a>
    </div>
  );
}
