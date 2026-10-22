import { spawn } from "node:child_process";

// Abre la guía en el navegador.
//
// La guía vive en la web del proyecto (ADR 0034 ✓): su contenido es el
// markdown del repo ✓ ✓ y la página la genera el sitio ✓ ✅. Aquí solo se
// abre la ruta ✓ ✅ —si el servidor de desarrollo está arriba ✓ ✅.

const URL = "http://localhost:5175/codarch/guia/";

const abierto = await fetch(URL, { method: "HEAD" }).catch(() => null);
if (!abierto || !abierto.ok) {
  console.log("La guía se sirve desde el sitio del proyecto.");
  console.log("Levántalo con: npm run site:dev");
  console.log(`Y está en: ${URL}`);
  process.exit(0);
}

const comando =
  process.platform === "win32"
    ? ["cmd", ["/c", "start", "", URL]]
    : process.platform === "darwin"
      ? ["open", [URL]]
      : ["xdg-open", [URL]];

try {
  const hijo = spawn(comando[0], comando[1], { stdio: "ignore", detached: true });
  hijo.unref();
  console.log(`ok · guía abierta en ${URL}`);
} catch {
  console.log(`La guía está en: ${URL}`);
}
