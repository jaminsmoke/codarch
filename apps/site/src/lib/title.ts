import { useEffect } from "react";
import { localeOf, t } from "./i18n";

/**
 * El título de la pestaña y la descripción.
 *
 * La web tiene una sola página HTML, así que cada ruta dice quién es.
 */

export function useTitle(
  title?: string,
  description?: string,
  lang: string = "es"
): void {
  useEffect(() => {
    const locale = localeOf(lang);
    document.title = title
      ? `${title} · CodArch`
      : t(locale, "meta.titulo");

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    if (meta && description) meta.content = description;
  }, [title, description, lang]);
}
