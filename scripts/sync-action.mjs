import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTION = path.join(ROOT, "apps", "github-action");
const OUT = path.join(ROOT, ".codarch", "action-repo");

await mkdir(OUT, { recursive: true });
// Conserva .git para poder sincronizar el mismo repo público sin perder su historial.
for (const entry of await readdir(OUT, { withFileTypes: true })) {
  if (entry.name === ".git") continue;
  await rm(path.join(OUT, entry.name), { recursive: true, force: true });
}

for (const file of ["action.yml", "render-comment.mjs"]) {
  await copyFile(path.join(ACTION, file), path.join(OUT, file));
}
await copyFile(path.join(ROOT, "LICENSE"), path.join(OUT, "LICENSE"));

const readme = await readFile(path.join(ACTION, "README.md"), "utf8");
const notice = [
  "> Repositorio generado desde [`jaminsmoke/codarch`](https://github.com/jaminsmoke/codarch).",
  "> No editar aquí: los cambios se hacen en `apps/github-action` y se sincronizan con",
  "> `npm run sync:action`.",
  "",
  ""
].join("\n");
await writeFile(path.join(OUT, "README.md"), notice + readme);

console.log(`ok · acción preparada en ${path.relative(ROOT, OUT)}`);
