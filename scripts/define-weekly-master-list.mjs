import { mkdir, writeFile } from "node:fs/promises";
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

function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function getFamilyLabel(item) {
  const raw = item.subCategory ?? item.category ?? "";
  if (
    raw === "Consumiveis" ||
    raw === "Consumiveis de Servico" ||
    raw === "Consumiveis Operacionais"
  ) {
    return "Consumiveis Operacionais";
  }
  if (raw === "Embalagens" || raw === "Embalagens Take Away") {
    return "Embalagens Take Away";
  }
  return raw || "Outros";
}

async function main() {
  try {
    const rawItems =
      await prisma.$queryRaw`SELECT id, sku, name, category, "subCategory", unit, status FROM inventory_items WHERE category IN ('Consumiveis', 'Produtos de Limpeza') AND status = 'ACTIVE'`;

    const items = rawItems.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      subCategory: row.subCategory,
      unit: row.unit,
      status: row.status,
      normalizedName: normalizeName(row.name),
      unitKey: String(row.unit ?? "").trim().toLowerCase(),
    }));

    const groups = new Map();
    for (const item of items) {
      const key = `${item.normalizedName}::${item.unitKey}`;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }

    const families = new Set();
    const canonicalItems = [];

    for (const [key, list] of groups.entries()) {
      // Ordenar por SKU para ter escolha determinística
      list.sort((a, b) => a.sku.localeCompare(b.sku));
      const canonical = list[0];
      const aliases = list.slice(1).map((i) => i.sku);

      const family = getFamilyLabel(canonical);
      families.add(family);

      canonicalItems.push({
        canonicalSku: canonical.sku,
        aliases,
        name: canonical.name,
        unit: canonical.unit,
        family,
      });
    }

    canonicalItems.sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name));

    const config = {
      generatedAt: new Date().toISOString(),
      families: [...families].sort(),
      items: canonicalItems,
    };

    const configDir = path.join(rootDir, "config");
    await mkdir(configDir, { recursive: true });

    const configPath = path.join(
      configDir,
      "inventory-weekly-master-list.json"
    );
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");

    console.warn(
      `Canonical weekly master list written to: ${configPath} (items: ${canonicalItems.length})`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

