import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    },
  },
});

async function loadConfig() {
  const configPath = path.join(
    rootDir,
    "config",
    "inventory-weekly-master-list.json"
  );
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const logLines = [];
  logLines.push("# Normalização de InventoryItem para Inventário Semanal");
  logLines.push("");

  try {
    const config = await loadConfig();

    for (const entry of config.items) {
      const { canonicalSku, aliases, name, unit, family } = entry;

      // Atualizar item canónico
      const canonicalItems =
        await prisma.$queryRaw`SELECT id, sku, name, unit, category, "subCategory", status FROM inventory_items WHERE sku = ${canonicalSku}`;

      if (canonicalItems.length === 0) {
        logLines.push(
          `- ⚠️ Canonical SKU **${canonicalSku}** não encontrado na tabela inventory_items.`
        );
      } else {
        const item = canonicalItems[0];

        // Opcional: alinhar subCategory com a família, exceto quando família é o próprio nome da categoria
        const desiredSubCategory =
          family === "Produtos de Limpeza" ? item.subCategory : family;

        await prisma.$executeRaw`
          UPDATE inventory_items
          SET name = ${name},
              unit = ${unit},
              "subCategory" = ${desiredSubCategory}
          WHERE sku = ${canonicalSku}
        `;

        logLines.push(
          `- ✅ Atualizado canónico **${canonicalSku}** → nome="${name}", unidade="${unit}", família="${family}".`
        );
      }

      // Processar aliases
      for (const aliasSku of aliases) {
        const aliasItems =
          await prisma.$queryRaw`SELECT id, sku, name, unit, category, "subCategory", status, "currentStock" FROM inventory_items WHERE sku = ${aliasSku}`;

        if (aliasItems.length === 0) {
          logLines.push(
            `  - ℹ️ Alias **${aliasSku}** não existe em inventory_items (ignorado).`
          );
          continue;
        }

        const alias = aliasItems[0];

        // Verificar movimentos e stock
        const txCount =
          await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM inventory_transactions WHERE "itemId" = ${alias.id}`;
        const hasTransactions = txCount[0].count > 0;
        const hasStock = Number(alias.currentStock ?? 0) !== 0;

        if (!hasTransactions && !hasStock) {
          // Seguro desativar
          await prisma.$executeRaw`UPDATE inventory_items SET status = 'INACTIVE' WHERE id = ${alias.id}`;
          logLines.push(
            `  - ✅ Alias **${aliasSku}** (${alias.name}) desativado (sem stock nem transações).`
          );
        } else {
          logLines.push(
            `  - ⚠️ Alias ativo **${aliasSku}** (${alias.name}) tem ${txCount[0].count} transações e stock atual ${alias.currentStock}; manter ACTIVE (apenas mapeado como alias).`
          );
        }
      }
    }

    logLines.push("");
    logLines.push(
      "_Nota: transações históricas continuaram a apontar para os SKUs originais; a consolidação lógica para a folha semanal é feita via lista canónica._"
    );
  } finally {
    await prisma.$disconnect();
  }

  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    "2026",
    "07-july",
    "Relatorio-Mensal-Consumiveis",
    "Logs-Auditoria"
  );
  await mkdir(outputDir, { recursive: true });
  const logPath = path.join(
    outputDir,
    `inventory-weekly-normalization-${new Date()
      .toISOString()
      .split("T")[0]}.md`
  );
  await writeFile(logPath, logLines.join("\n"), "utf8");

  console.warn(`Inventory normalization log written to: ${logPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

