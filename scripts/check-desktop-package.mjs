import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

// Un instalador sin `resources/app-update.yml` no se actualiza nunca:
// electron-updater lee ese archivo del paquete instalado y, si falta, la
// comprobación muere en silencio. Lo genera `publish` de electron-builder.yml,
// pero se comprueba aquí para enterarse en el CI y no en la app instalada
// (ADR 0045).
//
//   node scripts/check-desktop-package.mjs apps/desktop/release

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(
  process.argv[2] ?? path.join(root, "apps", "desktop", "release")
);

assert.ok(
  fs.existsSync(output),
  `no existe ${output}: empaqueta antes de comprobarlo`
);

// `win-unpacked` en Windows, `linux-unpacked` en Linux y `mac*` si algún día
// vuelve macOS: la comprobación no depende del sistema.
const unpacked = fs
  .readdirSync(output)
  .filter((name) => name.endsWith("-unpacked"))
  .filter((name) => fs.statSync(path.join(output, name)).isDirectory());

assert.ok(
  unpacked.length > 0,
  `no hay ninguna app desempaquetada en ${output}`
);

for (const name of unpacked) {
  const configPath = path.join(output, name, "resources", "app-update.yml");
  assert.ok(
    fs.existsSync(configPath),
    `falta ${name}/resources/app-update.yml: esa instalación no podrá actualizarse sola (¿se perdió publish en electron-builder.yml?)`
  );

  const config = parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(
    config?.provider,
    "github",
    `${name}: el actualizador no apunta a GitHub`
  );
  for (const clave of ["owner", "repo", "updaterCacheDirName"]) {
    assert.ok(
      typeof config?.[clave] === "string" && config[clave] !== "",
      `${name}: falta ${clave} en app-update.yml`
    );
  }
}

// Sin el canal, electron-updater sabe a qué release mirar pero no qué bajar.
const channels = fs
  .readdirSync(output)
  .filter((name) => /^latest.*\.yml$/.test(name));

assert.ok(
  channels.length > 0,
  `no hay latest*.yml en ${output}: electron-updater no sabría qué descargar`
);

console.log(
  `ok · ${unpacked.join(", ")} con app-update.yml y ${channels.join(", ")}`
);
