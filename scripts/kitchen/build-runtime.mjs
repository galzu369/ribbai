import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import { fromRoot, KITCHEN_CONFIG, PROJECT_ROOT } from "./lib/project-root.mjs";

/**
 * Empacota o motor de custeio num único ficheiro CommonJS sem dependências,
 * para que o computador do Chefe precise apenas de um node.exe portátil — sem
 * npm install, sem node_modules, sem tsx.
 */
const runtimeDir = fromRoot(KITCHEN_CONFIG.paths.runtimeDir);
mkdirSync(runtimeDir, { recursive: true });

const outfile = join(runtimeDir, "kitchen-costing-sync.cjs");

await build({
  entryPoints: [join(PROJECT_ROOT, "scripts/kitchen/runtime-entry.ts")],
  outfile,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  legalComments: "none",
  banner: {
    js: "// RIBBAÍ Kitchen Costing Sync — ficheiro gerado por scripts/kitchen/build-runtime.mjs. Não editar à mão.",
  },
});

console.log(`✓ Runtime: ${outfile}`);
