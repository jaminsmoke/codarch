import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";

const destination = ".codarch/pack";
await mkdir(destination, { recursive: true });

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : "npm";
const args = npmCli
  ? [npmCli, "pack", "apps/cli/dist", "--pack-destination", destination]
  : ["pack", "apps/cli/dist", "--pack-destination", destination];

execFileSync(command, args, { stdio: "inherit" });
