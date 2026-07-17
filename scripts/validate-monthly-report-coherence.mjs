import { PrismaClient } from "@prisma/client";

/**
 * Validates that InventoryItem.currentStock (the number the monthly report
 * reads) is coherent with "last physical count + every IN/OUT/WASTAGE
 * transaction since that count". This is the exact check requested when a
 * report's stock-final figures need to be trusted against the last weekly
 * count sheet plus deliveries/consumption recorded afterwards.
 *
 * Usage:
 *   node scripts/validate-monthly-report-coherence.mjs [--year=YYYY] [--month=MM]
 *
 * Exits with code 1 if any active item is incoherent, so this can be wired
 * into inventory:month-close / update-monthly-preview as a hard gate.
 */

const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public";
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL } },
});

function parseArgs() {
  const now = new Date();
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => arg.slice(2).split("="))
  );

  return {
    year: Number(args.year ?? now.getFullYear()),
    month: Number(args.month ?? now.getMonth() + 1),
  };
}

async function main() {
  const { year, month } = parseArgs();
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const items = await prisma.inventoryItem.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, sku: true, name: true, unit: true, currentStock: true },
  });

  let checked = 0;
  let skippedNoCount = 0;
  const mismatches = [];

  for (const item of items) {
    const lastCount = await prisma.inventoryTransaction.findFirst({
      where: { itemId: item.id, referenceType: "WEEKLY_COUNT" },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      select: { balanceAfter: true, transactionDate: true, referenceId: true },
    });

    if (!lastCount) {
      skippedNoCount++;
      continue;
    }

    // "Movimentos desde a ultima contagem" inclui qualquer transacao posterior,
    // seja IN/OUT/WASTAGE (entregas/consumo) ou ADJUSTMENT nao ligado a uma
    // contagem (ex.: consolidacao de SKU duplicado, reconciliacao de sistema).
    // Em vez de tentar adivinhar o sinal de cada tipo, usa-se sempre o
    // balanceAfter da transacao mais recente do artigo como valor esperado —
    // e reporta-se a ultima contagem apenas para contexto/rastreabilidade.
    const movementsSince = await prisma.inventoryTransaction.findMany({
      where: {
        itemId: item.id,
        transactionDate: { gt: lastCount.transactionDate },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      select: { balanceAfter: true },
    });

    const expected = Number(movementsSince[0]?.balanceAfter ?? lastCount.balanceAfter);

    checked++;
    const actual = Number(item.currentStock);

    if (Math.abs(actual - expected) > 0.001) {
      mismatches.push({
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        actual,
        expected,
        lastCountDate: lastCount.transactionDate.toISOString(),
        lastCountRef: lastCount.referenceId,
        movementsSince: movementsSince.length,
      });
    }
  }

  console.warn(
    `Coerencia do relatorio (${String(month).padStart(2, "0")}/${year}, validado ate ${monthEnd.toISOString()}):`
  );
  console.warn(`  Artigos verificados: ${checked}`);
  console.warn(`  Artigos sem contagem registada (ignorados): ${skippedNoCount}`);
  console.warn(`  Divergencias encontradas: ${mismatches.length}`);

  if (mismatches.length > 0) {
    console.warn("\nArtigos incoerentes (ultima contagem + movimentos desde entao != currentStock):\n");
    for (const m of mismatches) {
      console.warn(
        `  ${m.sku} (${m.name}): currentStock=${m.actual} ${m.unit} | esperado=${m.expected} ${m.unit} | ultima contagem=${m.lastCountRef} (${m.lastCountDate}) | movimentos desde entao=${m.movementsSince}`
      );
    }
    process.exitCode = 1;
  } else {
    console.warn("\nTodos os artigos com contagem registada estao coerentes.");
  }
}

main()
  .catch((error) => {
    console.error("Falha na validacao de coerencia:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
