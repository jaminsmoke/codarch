import { useEffect } from "react";

/**
 * El título de la pestaña y la descripción ✓ ✅.
 *
 * La web tiene una sola página HTML ✓ ✅, así que cada ruta dice quién es ✓ ✅.
 */

const BASE = "CodArch · el mapa vivo de la arquitectura de tu software";

export function useTitulo(titulo?: string, descripcion?: string): void {
  useEffect(() => {
    document.title = titulo ? `${titulo} · CodArch` : BASE;

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    if (meta && descripcion) meta.content = descripcion;
  }, [titulo, descripcion]);
}
