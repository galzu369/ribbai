import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SKU = "CLEAN-LAVA-LOUCAS";
const NOME_ANTIGO = "Lava-Louças";
const NOME_NOVO = "Lava-Louça Universal";
const UPDATED_BY = "OPS-UNIFORMIZATION-LAVA-LOUCA-UNIVERSAL";

async function main() {
  console.log("=== RIBBAI - Uniformização Lava-Louça Universal ===");
  console.log(`SKU: ${SKU}`);
  console.log(`Nome: "${NOME_ANTIGO}" → "${NOME_NOVO}"`);
  console.log("");

  const produto = await prisma.inventoryItem.findUnique({
    where: { sku: SKU },
    select: {
      id: true,
      sku: true,
      name: true,
      unit: true,
      currentStock: true,
    },
  });

  if (!produto) {
    console.log(`❌ Produto não encontrado: ${SKU}`);
    return;
  }

  console.log("📊 Estado atual:");
  console.log(`   Nome: ${produto.name}`);
  console.log(`   Unidade: ${produto.unit}`);
  console.log(`   Stock: ${produto.currentStock}`);
  console.log("");

  if (produto.name === NOME_NOVO) {
    console.log("✅ Produto já está com o nome correto!");
    return;
  }

  await prisma.inventoryItem.update({
    where: { id: produto.id },
    data: {
      name: NOME_NOVO,
      updatedBy: UPDATED_BY,
    },
  });

  console.log("✅ Nome uniformizado com sucesso!");
  console.log("");
  console.log("📊 Estado final:");
  console.log(`   • SKU: ${SKU}`);
  console.log(`   • Nome: ${NOME_NOVO}`);
  console.log(`   • Stock: ${produto.currentStock} ${produto.unit}`);
  console.log("");
  console.log("ℹ️  Nota: Lava-Louças e Lava-Louça Universal são o mesmo artigo (CLEAN-LAVA-LOUCAS).");
  console.log("   Relatórios gerados anteriormente mantêm o nome antigo até serem regenerados.");
}

main()
  .catch((error) => {
    console.error("❌ Erro:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
