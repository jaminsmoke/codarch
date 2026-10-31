import { getCollection } from "astro:content";
import normas from "../../docs/desarrollo/guideline/normas.md?raw";
import normasEn from "../../docs/en/desarrollo/guideline/normas.md?raw";
import { prepareGuide } from "./guide-server";

/**
 * La guía del repo, cargada en el build (ADR 0046 · ADR 0047).
 *
 * Vive aparte de `guide-server.ts` para que los tests puedan probar la
 * preparación sin depender de `astro:content` ni de los imports `?raw`.
 * Cada idioma tiene sus entradas y sus rules: la guía se traduce entera.
 */
export async function loadGuide(lang = "es") {
  const ingles = lang === "en";
  const fuentes = await getCollection(ingles ? "guiaEn" : "guia");
  return prepareGuide(fuentes, ingles ? normasEn : normas, lang);
}
