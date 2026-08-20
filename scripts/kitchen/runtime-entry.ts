import { MENU_ITEMS_DIR, PATHS } from "./lib/config";
import { runInstallCheck } from "./lib/health-check";
import { ENGINE_VERSION, PROJECT_ROOT } from "./lib/project-root";
import { main } from "./update-costing";

/**
 * Entry point do runtime portátil (o que o launcher .cmd executa). Envolve o
 * motor com mensagens dirigidas ao Chefe de Cozinha, que corre isto por duplo
 * clique e nunca vê um terminal de desenvolvimento.
 *
 * Fluxo com --apply:
 *   1. Sincroniza preços do Preçário → fichas
 *   2. Regenera o relatório executivo HTML + PDF
 */
const BANNER = `
============================================================
 RIBBAÍ — Atualização das Fichas Técnicas
 Motor de custeio ${ENGINE_VERSION}
============================================================
`;

async function run(): Promise<void> {
  console.log(BANNER);

  if (process.argv.includes("--install-check")) {
    process.exit(runInstallCheck(MENU_ITEMS_DIR) ? 0 : 1);
  }

  console.log(`  Pasta do sistema: ${PROJECT_ROOT}`);
  console.log(`  Preçário:         ${PATHS.pricebookXlsx}\n`);

  await main();

  const apply = process.argv.includes("--apply");
  if (apply) {
    console.log(`
------------------------------------------------------------
 Sincronização concluída com sucesso.

 As fichas técnicas foram atualizadas com os preços do
 Preçário. O relatório executivo (HTML + PDF) foi regenerado
 em docs\\kitchen\\costing\\reports\\

 Já pode abrir as fichas no Excel e o relatório no browser.
------------------------------------------------------------
`);
  }
}

run().catch((err: unknown) => {
  console.error(`
------------------------------------------------------------
 A SINCRONIZAÇÃO NÃO FOI CONCLUÍDA.

 Nenhum ficheiro ficou meio atualizado — foi reposto o estado
 anterior sempre que necessário.

 Motivo:
 ${err instanceof Error ? err.message : String(err)}
------------------------------------------------------------
`);
  process.exit(1);
});
