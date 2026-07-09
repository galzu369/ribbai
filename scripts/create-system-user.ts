import { prisma } from "../lib/db/client";

async function main() {
  const email = "system@ribbai.local";

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("System user already exists with id:", existing.id);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: "System User",
      isActive: true,
    },
  });

  console.log("Created system user with id:", user.id);
}

main()
  .catch((error) => {
    console.error("Failed to create system user:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

