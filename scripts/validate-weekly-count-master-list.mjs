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

  const labelCounts = new Map();
  const families = new Set();
  const units = new Set();

  for (const item of items) {
    const count = labelCounts.get(item.label) ?? 0;
    labelCounts.set(item.label, count + 1);
    families.add(item.family);

    const unitMatch = item.label.match(/\((.*?)\)\s*$/);
    if (unitMatch) {
      units.add(unitMatch[1]);
    }
  }

  const duplicated = [...labelCounts.entries()].filter(([, c]) => c > 1);
  const allowedUnits = new Set([
    "caixa",
    "pack",
    "saco",
    "unidade",
    "litro",
    "kg",
  ]);

  const invalidUnits = [...units].filter((u) => !allowedUnits.has(u));

  const expectedFamilies = new Set([
    "Consumiveis Operacionais",
    "Consumiveis WC",
    "Copos Take Away",
    "Embalagens Take Away",
    "Galheteiros",
    "Molhos",
    "Produtos de Limpeza",
    "Talheres Take Away",
  ]);
  const unexpectedFamilies = [...families].filter(
    (f) => !expectedFamilies.has(f)
  );

  const lines = [];
  lines.push("# Validação da Lista Mestre de Inventário Semanal");
  lines.push("");
  lines.push(
    `Total de linhas de itens na folha (todas as páginas): **${items.length}**.`
  );
  lines.push("");

  // Duplicates
  if (duplicated.length === 0) {
    lines.push("## Duplicações");
    lines.push("");
    lines.push("✅ Nenhuma duplicação de label encontrada.");
  } else {
    lines.push("## Duplicações");
    lines.push("");
    lines.push(
      "| Label | Ocorrências |"
    );
    lines.push("|-------|-------------|");
    for (const [label, count] of duplicated) {
      lines.push(`| ${label} | ${count} |`);
    }
  }
  lines.push("");

  // Units
  lines.push("## Unidades Utilizadas");
  lines.push("");
  lines.push(
    `Unidades distintas encontradas: ${[...units]
      .sort()
      .map((u) => `\`${u}\``)
      .join(", ")}.`
  );
  lines.push("");
  if (invalidUnits.length === 0) {
    lines.push("✅ Todas as unidades pertencem ao conjunto permitido.");
  } else {
    lines.push("⚠️ Unidades fora do conjunto permitido:");
    lines.push("");
    for (const u of invalidUnits.sort()) {
      lines.push(`- ${u}`);
    }
  }
  lines.push("");

  // Families
  lines.push("## Famílias");
  lines.push("");
  lines.push(
    `Famílias encontradas: ${[...families]
      .sort()
      .map((f) => `\`${f}\``)
      .join(", ")}.`
  );
  lines.push("");
  if (unexpectedFamilies.length === 0) {
    lines.push("✅ Todas as famílias pertencem ao conjunto esperado.");
  } else {
    lines.push("⚠️ Famílias inesperadas detectadas:");
    lines.push("");
    for (const f of unexpectedFamilies.sort()) {
      lines.push(`- ${f}`);
    }
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
  const reportPath = path.join(
    outputDir,
    "2026-06-12-weekly-count-validation.md"
  );
  await writeFile(reportPath, lines.join("\n"), "utf8");

  console.warn(`Weekly count master list validation written to: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

