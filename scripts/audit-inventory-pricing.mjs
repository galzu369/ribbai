import { mkdir, writeFile, readFile } from "node:fs/promises";
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

const monthDirectoryNames = [
  "01-january",
  "02-february",
  "03-march",
  "04-april",
  "05-may",
  "06-june",
  "07-july",
  "08-august",
  "09-september",
  "10-october",
  "11-november",
  "12-december",
];

function formatDecimal(value, fractionDigits = 3) {
  const num = Number(value ?? 0);
  return num.toLocaleString("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

function formatCurrency(value) {
  const num = Number(value ?? 0);
  return num.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function loadMasterList() {
  const configPath = path.join(
    rootDir,
    "config",
    "inventory-weekly-master-list.json"
  );
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw);
}

async function getAliasTransactionCounts(aliasItems) {
  if (aliasItems.length === 0) {
    return new Map();
  }

  const ids = aliasItems.map((item) => item.id);

  const grouped = await prisma.inventoryTransaction.groupBy({
    by: ["itemId"],
    where: {
      itemId: { in: ids },
    },
    _count: {
      id: true,
    },
  });

  const map = new Map();
  for (const row of grouped) {
    map.set(row.itemId, row._count.id);
  }
  return map;
}

async function main() {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const year = now.getFullYear();
  const monthDir = monthDirectoryNames[now.getMonth()];

  const logLines = [];
  logLines.push(`# Auditoria Global de Preços e Unidades`);
  logLines.push(``);
  logLines.push(`Data: ${todayStr}`);
  logLines.push(
    `Fonte de dados: inventory_items, inventory_transactions, inventory-weekly-master-list.json`
  );
  logLines.push(``);

  try {
    const masterList = await loadMasterList();

    const expectedUnits = new Map();
    const aliasSkus = new Set();

    for (const entry of masterList.items ?? []) {
      if (entry.canonicalSku && entry.unit) {
        expectedUnits.set(entry.canonicalSku, {
          sku: entry.canonicalSku,
          unit: entry.unit,
          source: "canonical",
          name: entry.name,
        });
      }

      if (Array.isArray(entry.aliases)) {
        for (const aliasSku of entry.aliases) {
          aliasSkus.add(aliasSku);
          if (entry.unit) {
            expectedUnits.set(aliasSku, {
              sku: aliasSku,
              unit: entry.unit,
              source: "alias",
              name: entry.name,
              canonicalSku: entry.canonicalSku,
            });
          }
        }
      }
    }

    const items = await prisma.inventoryItem.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        costPrice: true,
        averageCost: true,
        lastPurchaseCost: true,
        lastPurchaseDate: true,
        stockValue: true,
        currentStock: true,
        status: true,
      },
      orderBy: {
        sku: "asc",
      },
    });

    const itemsBySku = new Map(items.map((item) => [item.sku, item]));

    const itemsWithoutPrice = [];
    const itemsWithStockNoPrice = [];
    const itemsWithoutLastPurchase = [];

    for (const item of items) {
      const costPriceNum = Number(item.costPrice ?? 0);
      const avgCostNum = Number(item.averageCost ?? 0);
      const hasPrice = costPriceNum > 0 || avgCostNum > 0;
      const stockNum = Number(item.currentStock ?? 0);

      if (!hasPrice) {
        itemsWithoutPrice.push(item);
        if (stockNum > 0 && item.status === "ACTIVE") {
          itemsWithStockNoPrice.push(item);
        }
      }

      const lastPurchaseCostNum = Number(item.lastPurchaseCost ?? 0);
      if (!item.lastPurchaseDate || lastPurchaseCostNum === 0) {
        itemsWithoutLastPurchase.push(item);
      }
    }

    const unitMismatches = [];
    const missingInDb = [];

    for (const [sku, expected] of expectedUnits.entries()) {
      const item = itemsBySku.get(sku);
      if (!item) {
        missingInDb.push(expected);
        continue;
      }

      if (item.unit !== expected.unit) {
        unitMismatches.push({
          sku,
          nameDb: item.name,
          nameConfig: expected.name,
          unitDb: item.unit,
          unitExpected: expected.unit,
          source: expected.source,
          canonicalSku: expected.canonicalSku ?? null,
        });
      }
    }

    const aliasItems = items.filter((item) => aliasSkus.has(item.sku));
    const aliasTxCounts = await getAliasTransactionCounts(aliasItems);

    const aliasWithActivity = [];
    for (const alias of aliasItems) {
      const stockNum = Number(alias.currentStock ?? 0);
      const txCount = aliasTxCounts.get(alias.id) ?? 0;

      if (stockNum !== 0 || txCount > 0) {
        aliasWithActivity.push({
          sku: alias.sku,
          name: alias.name,
          unit: alias.unit,
          status: alias.status,
          currentStock: stockNum,
          txCount,
        });
      }
    }

    logLines.push(`## 1. Resumo Executivo`);
    logLines.push(``);
    logLines.push(
      `- Total de artigos em inventory_items: **${items.length}**`
    );
    logLines.push(
      `- Artigos sem preço (costPrice/averageCost = 0): **${itemsWithoutPrice.length}**`
    );
    logLines.push(
      `- Artigos com stock > 0 e sem preço: **${itemsWithStockNoPrice.length}**`
    );
    logLines.push(
      `- Artigos sem última compra registada (lastPurchaseCost/Data): **${itemsWithoutLastPurchase.length}**`
    );
    logLines.push(
      `- Divergências de unidade vs master list: **${unitMismatches.length}**`
    );
    logLines.push(
      `- SKUs da master list em falta na BD: **${missingInDb.length}**`
    );
    logLines.push(
      `- Aliases com stock ou transações ativas: **${aliasWithActivity.length}**`
    );
    logLines.push(``);

    logLines.push(`## 2. Artigos sem preço configurado`);
    logLines.push(``);
    if (itemsWithoutPrice.length === 0) {
      logLines.push(`Nenhum artigo encontrado sem preço configurado.`);
      logLines.push(``);
    } else {
      logLines.push(
        `| SKU | Nome | Unidade | Stock Atual | Valor Stock | Status |`
      );
      logLines.push(`| --- | ---- | ------- | -----------:| -----------:| ------ |`);
      for (const item of itemsWithoutPrice) {
        logLines.push(
          `| \`${item.sku}\` | ${item.name} | ${item.unit} | ${formatDecimal(
            item.currentStock
          )} | ${formatCurrency(item.stockValue)} | ${item.status} |`
        );
      }
      logLines.push(``);
    }

    logLines.push(
      `## 3. Artigos com stock > 0 e sem preço (prioridade máxima)`
    );
    logLines.push(``);
    if (itemsWithStockNoPrice.length === 0) {
      logLines.push(`Nenhum artigo com stock > 0 e sem preço.`);
      logLines.push(``);
    } else {
      logLines.push(
        `| SKU | Nome | Unidade | Stock Atual | Valor Stock | Status |`
      );
      logLines.push(`| --- | ---- | ------- | -----------:| -----------:| ------ |`);
      for (const item of itemsWithStockNoPrice) {
        logLines.push(
          `| \`${item.sku}\` | ${item.name} | ${item.unit} | ${formatDecimal(
            item.currentStock
          )} | ${formatCurrency(item.stockValue)} | ${item.status} |`
        );
      }
      logLines.push(``);
    }

    logLines.push(
      `## 4. Artigos sem última compra registada (lastPurchaseCost/Data)`
    );
    logLines.push(``);
    if (itemsWithoutLastPurchase.length === 0) {
      logLines.push(
        `Todos os artigos têm informação básica de última compra preenchida.`
      );
      logLines.push(``);
    } else {
      logLines.push(
        `| SKU | Nome | Unidade | Stock Atual | Custo Médio | Último Custo Compra | Última Compra |`
      );
      logLines.push(
        `| --- | ---- | ------- | -----------:| -----------:| -------------------:| ------------- |`
      );
      for (const item of itemsWithoutLastPurchase) {
        logLines.push(
          `| \`${item.sku}\` | ${item.name} | ${item.unit} | ${formatDecimal(
            item.currentStock
          )} | ${formatCurrency(item.averageCost)} | ${formatCurrency(
            item.lastPurchaseCost
          )} | ${item.lastPurchaseDate ? item.lastPurchaseDate.toISOString() : "-"} |`
        );
      }
      logLines.push(``);
    }

    logLines.push(
      `## 5. Divergências de unidade entre inventory_items e master list`
    );
    logLines.push(``);
    if (unitMismatches.length === 0) {
      logLines.push(`Nenhuma divergência de unidade encontrada.`);
      logLines.push(``);
    } else {
      logLines.push(
        `| SKU | Nome BD | Nome Config | Unidade BD | Unidade Esperada | Tipo | Canónico |`
      );
      logLines.push(
        `| --- | ------- | ----------- | ---------- | ---------------- | ---- | -------- |`
      );
      for (const row of unitMismatches) {
        logLines.push(
          `| \`${row.sku}\` | ${row.nameDb} | ${row.nameConfig} | ${
            row.unitDb
          } | ${row.unitExpected} | ${row.source} | ${
            row.canonicalSku ? `\`${row.canonicalSku}\`` : "-"
          } |`
        );
      }
      logLines.push(``);
    }

    logLines.push(`## 6. SKUs da master list em falta na base de dados`);
    logLines.push(``);
    if (missingInDb.length === 0) {
      logLines.push(`Nenhum SKU da master list em falta na base de dados.`);
      logLines.push(``);
    } else {
      logLines.push(`| SKU | Nome | Unidade Esperada | Tipo | Canónico |`);
      logLines.push(`| --- | ---- | ---------------- | ---- | -------- |`);
      for (const row of missingInDb) {
        logLines.push(
          `| \`${row.sku}\` | ${row.name} | ${row.unit} | ${row.source} | ${
            row.canonicalSku ? `\`${row.canonicalSku}\`` : "-"
          } |`
        );
      }
      logLines.push(``);
    }

    logLines.push(
      `## 7. Aliases com stock ou transações (devem ser consolidados)`
    );
    logLines.push(``);
    if (aliasWithActivity.length === 0) {
      logLines.push(
        `Nenhum alias com stock ou transações ativas (bom sinal para consolidação).`
      );
      logLines.push(``);
    } else {
      logLines.push(
        `| SKU Alias | Nome | Unidade | Status | Stock Atual | Nº Transações |`
      );
      logLines.push(
        `| --------- | ---- | ------- | ------ | -----------:| ------------:|`
      );
      for (const alias of aliasWithActivity) {
        logLines.push(
          `| \`${alias.sku}\` | ${alias.name} | ${alias.unit} | ${
            alias.status
          } | ${formatDecimal(alias.currentStock)} | ${
            alias.txCount
          } |`
        );
      }
      logLines.push(``);
    }
  } finally {
    await prisma.$disconnect();
  }

  const outputDir = path.join(
    rootDir,
    "docs",
    "operational-records",
    String(year),
    monthDir,
    "Relatorio-Mensal-Consumiveis",
    "Logs-Auditoria"
  );

  await mkdir(outputDir, { recursive: true });

  const logPath = path.join(
    outputDir,
    `pricing-intelligence-audit-${todayStr}.md`
  );

  await writeFile(logPath, logLines.join("\n"), "utf8");

  console.warn(`Pricing audit log written to: ${logPath}`);
}

main().catch((error) => {
  console.error("Erro na auditoria global de preços/unidades:", error);
  process.exitCode = 1;
});

