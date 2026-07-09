import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

process.env.DATABASE_URL ??= env.DATABASE_URL;

const prismaClientSingleton = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export type DatabaseClient = typeof prisma;
