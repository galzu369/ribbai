import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging";

export type AuditLogInput = {
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  status?: "SUCCESS" | "FAILED";
  errorMessage?: string;
};

export async function writeAuditLog({
  status = "SUCCESS",
  ...input
}: AuditLogInput) {
  if (!env.AUDIT_LOG_ENABLED) {
    return null;
  }

  try {
    return await prisma.auditLog.create({
      data: {
        ...input,
        status,
      },
    });
  } catch (error) {
    logger.error("Failed to write audit log", {
      error,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
    });

    return null;
  }
}
