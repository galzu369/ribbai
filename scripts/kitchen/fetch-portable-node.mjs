import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { get } from "node:https";
import { join } from "node:path";
import { fromRoot, KITCHEN_CONFIG } from "./lib/project-root.mjs";

/**
 * Descarrega o node.exe portátil para runtime/node/, para que o computador do
 * Chefe não precise de instalar Node.js (nem de permissões de administrador).
 * O binário é verificado contra o SHASUMS256 oficial antes de ser gravado.
 */
const NODE_VERSION = "v22.20.0";
const BASE = `https://nodejs.org/dist/${NODE_VERSION}`;
const EXE_PATH = "win-x64/node.exe";

function fetch(url) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        fetch(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} em ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

const targetDir = join(fromRoot(KITCHEN_CONFIG.paths.runtimeDir), "node");
const targetExe = join(targetDir, "node.exe");

if (existsSync(targetExe) && !process.argv.includes("--force")) {
  console.log(`✓ Node portátil já presente: ${targetExe}`);
  process.exit(0);
}

console.log(`A obter checksums oficiais (${NODE_VERSION})…`);
const shasums = (await fetch(`${BASE}/SHASUMS256.txt`)).toString("utf-8");
const expected = shasums
  .split("\n")
  .map((l) => l.trim().split(/\s+/))
  .find(([, name]) => name === EXE_PATH)?.[0];
if (!expected) {
  throw new Error(`SHASUMS256.txt não contém uma entrada para ${EXE_PATH}`);
}

console.log(`A descarregar node.exe (~82 MB)…`);
const bytes = await fetch(`${BASE}/${EXE_PATH}`);
const actual = createHash("sha256").update(bytes).digest("hex");
if (actual !== expected) {
  throw new Error(
    `Checksum não corresponde ao oficial — download rejeitado.\n  esperado: ${expected}\n  obtido:   ${actual}`,
  );
}

mkdirSync(targetDir, { recursive: true });
writeFileSync(targetExe, bytes);
writeFileSync(
  join(targetDir, "VERSION.txt"),
  `${NODE_VERSION}\nsha256 ${actual}\norigem ${BASE}/${EXE_PATH}\n`,
  "utf-8",
);
console.log(`✓ Node portátil verificado e instalado: ${targetExe}`);
