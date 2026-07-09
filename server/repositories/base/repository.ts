import type { Prisma } from "@prisma/client";

import { prisma, type DatabaseClient } from "@/lib/db";

export type RepositoryDatabase = DatabaseClient | Prisma.TransactionClient;

export type RepositoryContext = {
  db?: RepositoryDatabase;
  actorId?: string;
};

export abstract class BaseRepository {
  protected readonly db: RepositoryDatabase;
  protected readonly actorId?: string;

  protected constructor(context: RepositoryContext = {}) {
    this.db = context.db ?? prisma;
    this.actorId = context.actorId;
  }
}
