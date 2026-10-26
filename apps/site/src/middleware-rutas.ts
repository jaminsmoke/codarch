import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { zonaDeRuta } from "./lib/zonas.mjs";

/**
 * «Anterior» y «Siguiente» no cruzan de zona (ADR 0081): la sidebar de
 * Starlight es una sola lista con las dos zonas, así que al final de la
 * Documentación el siguiente sería el roadmap.
 */
export const onRequest = defineRouteMiddleware((contexto) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const zonaDe = (ruta: string) =>
    zonaDeRuta(ruta.startsWith(base) ? ruta.slice(base.length) || "/" : ruta);
  const { pagination } = contexto.locals.starlightRoute;
  const zona = zonaDe(contexto.url.pathname);
  if (pagination.prev && zonaDe(pagination.prev.href) !== zona)
    pagination.prev = undefined;
  if (pagination.next && zonaDe(pagination.next.href) !== zona)
    pagination.next = undefined;
});
