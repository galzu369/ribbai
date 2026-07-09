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

function buildInventoryAudit(items) {
  const byLabelKey = new Map();
  const byNameKey = new Map();

  for (const item of items) {
    const normalizedName = normalizeName(item.name);
    const unitKey = String(item.unit ?? "").trim().toLowerCase();
    const labelKey = `${normalizedName}::${unitKey}`;

    const labelEntry = byLabelKey.get(labelKey) ?? {
      normalizedName,
      unit: unitKey,
      items: [],
    };
    labelEntry.items.push(item);
    byLabelKey.set(labelKey, labelEntry);

    const nameEntry = byNameKey.get(normalizedName) ?? {
      normalizedName,
      units: new Set(),
      items: [],
    };
    nameEntry.units.add(unitKey);
    nameEntry.items.push(item);
    byNameKey.set(normalizedName, nameEntry);
  }

  const strongDuplicates = [...byLabelKey.values()].filter(
    (entry) => entry.items.length > 1
  );

  const unitConflicts = [...byNameKey.values()].filter(
    (entry) => entry.units.size > 1
  );

  const lines = [];
  lines.push("# Auditoria de InventoryItem para Inventário Semanal");
  lines.push("");
  lines.push(
    `Total de registos considerados: **${items.length}** (status = ACTIVE, categorias Consumiveis / Produtos de Limpeza).`
  );
  lines.push("");

  // Strong duplicates (same normalized name + unit)
  lines.push("## Duplicações Fortes (mesmo nome normalizado + unidade)");
  lines.push("");
  if (strongDuplicates.length === 0) {
    lines.push("✅ Não foram encontradas duplicações fortes.");
  } else {
    lines.push(
      "| Nome normalizado | Unidade | Nº itens | SKUs | Nomes originais | Subcategorias |"
    );
    lines.push(
      "|------------------|---------|---------:|------|------------------|--------------|"
    );
    for (const entry of strongDuplicates) {
      const skus = entry.items.map((i) => i.sku).join(", ");
      const names = [...new Set(entry.items.map((i) => i.name))].join(", ");
      const subs = [
        ...new Set(
          entry.items.map((i) => i.subCategory ?? i.category ?? "N/A")
        ),
      ].join(", ");
      lines.push(
        `| ${entry.normalizedName} | ${entry.unit || "-"} | ${
          entry.items.length
        } | ${skus} | ${names} | ${subs} |`
      );
    }
  }
  lines.push("");

  // Unit conflicts (same normalized name, different units)
  lines.push("## Conflitos de Unidade (mesmo nome normalizado, unidades diferentes)");
  lines.push("");
  if (unitConflicts.length === 0) {
    lines.push("✅ Não foram encontrados conflitos de unidade.");
  } else {
    lines.push("| Nome normalizado | Unidades | SKUs | Nomes originais |");
    lines.push("|------------------|----------|------|------------------|");
    for (const entry of unitConflicts) {
      const units = [...entry.units].join(", ");
      const skus = entry.items.map((i) => i.sku).join(", ");
      const names = [...new Set(entry.items.map((i) => i.name))].join(", ");
      lines.push(
        `| ${entry.normalizedName} | ${units} | ${skus} | ${names} |`
      );
    }
  }
  lines.push("");

  // Items by family for quick review
  lines.push("## Itens por Família (Categoria/Subcategoria)");
  lines.push("");
  const byFamily = new Map();
  for (const item of items) {
    const family =
      item.subCategory ??
      item.category ??
      "SEM_CATEGORIA";
    const list = byFamily.get(family) ?? [];
    list.push(item);
    byFamily.set(family, list);
  }

  for (const [family, list] of [...byFamily.entries()].sort()) {
    lines.push(`### Família: ${family}`);
    lines.push("");
    lines.push("| SKU | Nome | Unidade | Categoria | Subcategoria |");
    lines.push("|-----|------|---------|-----------|-------------|");
    for (const item of list.sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(
        `| ${item.sku} | ${item.name} | ${item.unit ?? ""} | ${
          item.category
        } | ${item.subCategory ?? ""} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
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
    }));

    const report = buildInventoryAudit(items);

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

    const reportPath = path.join(
      outputDir,
      "inventory-weekly-count-audit.md"
    );
    await writeFile(reportPath, report, "utf8");

    console.warn(
      `Inventory items audit written to: ${reportPath} (items: ${items.length})`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

