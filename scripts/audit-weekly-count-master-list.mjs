import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function extractItemsWithFamilies(html) {
  const lines = html.split("\n");
  const items = [];
  let currentFamily = null;

  for (const line of lines) {
    const familyMatch = line.match(
      /<tr class="family-row"><td colspan="\d+">(.*?)<\/td><\/tr>/
    );
    if (familyMatch) {
      currentFamily = familyMatch[1].trim();
      continue;
    }

    const itemMatch = line.match(
      /<tr class="item-row"><td class="item-cell">(.*?)<\/td>/
    );
    if (itemMatch) {
      const rawLabel = itemMatch[1].trim();
      const label = rawLabel.replace(/\s+/g, " ");
      items.push({
        label,
        family: currentFamily ?? "UNKNOWN",
      });
    }
  }

  return items;
}

function buildDuplicatesReport(items) {
  const byLabel = new Map();
  for (const item of items) {
    const entry = byLabel.get(item.label) ?? {
      label: item.label,
      count: 0,
      families: new Set(),
    };
    entry.count += 1;
    if (item.family) {
      entry.families.add(item.family);
    }
    byLabel.set(item.label, entry);
  }

  const duplicates = [...byLabel.values()]
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const lines = [];
  lines.push("# Auditoria da Folha de Inventário Semanal");
  lines.push("");
  lines.push(
    "Fonte: `docs/operational-records/2026/inventory-count-sheets/2026-06-12-inventario-semanal-contagem-fisica.html`"
  );
  lines.push("");
  lines.push(
    `Total de linhas de itens na folha: **${items.length}** (incluindo duplicações).`
  );
  lines.push(
    `Total de labels únicos: **${byLabel.size}**. Itens com duplicações listados abaixo.`
  );
  lines.push("");

  if (duplicates.length === 0) {
    lines.push("✅ Não foram encontradas duplicações de labels na folha.");
    return lines.join("\n");
  }

  lines.push("## Itens Duplicados na Folha");
  lines.push("");
  lines.push("| Label | Ocorrências | Famílias |");
  lines.push("|-------|-------------|----------|");
  for (const dup of duplicates) {
    lines.push(
      `| ${dup.label} | ${dup.count} | ${[...dup.families].join(", ")} |`
    );
  }
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const htmlPath = path.join(
    rootDir,
    "docs",
    "operational-records",
    "2026",
    "inventory-count-sheets",
    "2026-06-12-inventario-semanal-contagem-fisica.html"
  );

  const html = await readFile(htmlPath, "utf8");
  const items = extractItemsWithFamilies(html);
  const report = buildDuplicatesReport(items);

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
    "2026-06-12-weekly-count-duplicates.md"
  );
  await writeFile(reportPath, report, "utf8");

  console.warn(
    `Weekly count master list audit written to: ${reportPath} (items: ${items.length})`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

