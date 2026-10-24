/** Las peticiones JSON de la web: el servidor local, la demo y las URL. */

export async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    // El servidor responde 204 cuando no hay reporte que enseñar.
    if (response.status === 204) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

/** Igual que `fetchJson`, pero explica por qué falló la carga por URL. */
export async function fetchJsonStrict(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(
      `no se pudo contactar con ${url} (${(cause as Error).message}). Si el origen no permite CORS, sirve el fichero desde el mismo servidor.`
    );
  }
  if (!response.ok) {
    throw new Error(`respondió ${response.status}`);
  }
  try {
    return (await response.json()) as unknown;
  } catch (cause) {
    throw new Error(`el JSON no es válido (${(cause as Error).message})`);
  }
}
