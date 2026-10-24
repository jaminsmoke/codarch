import { useEffect } from "react";
import { idiomaDe, t } from "./i18n";

/**
 * El título de la pestaña y la descripción ✓ ✅.
 *
 * La web tiene una sola página HTML ✓ ✅, así que cada ruta dice quién es ✓ ✅.
 */

export function useTitulo(
  titulo?: string,
  descripcion?: string,
  lang: string = "es"
): void {
  useEffect(() => {
    const idioma = idiomaDe(lang);
    document.title = titulo
      ? `${titulo} · CodArch`
      : t(idioma, "meta.titulo");

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    if (meta && descripcion) meta.content = descripcion;
  }, [titulo, descripcion, lang]);
}
