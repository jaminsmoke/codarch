import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { zoneOfPath } from "./lib/zones.mjs";

/**
 * «Anterior» y «Siguiente» no cruzan de zona (ADR 0081): la sidebar de
 * Starlight es una sola lista con las dos zonas, así que al final de la
 * Documentación el siguiente sería el roadmap.
 */
export const onRequest = defineRouteMiddleware((contexto) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const zoneOf = (path: string) =>
    zoneOfPath(path.startsWith(base) ? path.slice(base.length) || "/" : path);
  const { pagination } = contexto.locals.starlightRoute;
  const zona = zoneOf(contexto.url.pathname);
  if (pagination.prev && zoneOf(pagination.prev.href) !== zona)
    pagination.prev = undefined;
  if (pagination.next && zoneOf(pagination.next.href) !== zona)
    pagination.next = undefined;
});
