import { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { BaseService, type ServiceContext } from "../base";

export type CreateWorkforceScheduleInput = {
  year: number;
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  location?: string | null;
  department?: string | null;
  importedByUserId?: string | null;
  document: {
    title: string;
    description?: string | null;
    category: string;
    subCategory?: string | null;
    tags?: string[];
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
};

export class WorkforceScheduleService extends BaseService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma, context: ServiceContext = {}) {
    super(context);
    this.prisma = prismaClient;
  }

  async createFromDocument(input: CreateWorkforceScheduleInput) {
    const {
      year,
      weekNumber,
      weekStartDate,
      weekEndDate,
      location,
      department,
      importedByUserId,
      document,
    } = input;

    try {
      const ownerId = await this.resolveOwnerId(importedByUserId);

      const createdDocument = await this.prisma.document.create({
        data: {
          title: document.title,
          description: document.description ?? undefined,
          category: document.category,
          subCategory: document.subCategory ?? undefined,
          tags: document.tags ?? [],
          fileUrl: document.fileUrl,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          ownerId,
          allowedRoles: [],
          status: "ACTIVE",
          isPublic: false,
        },
      });

      const schedule = await this.prisma.workforceSchedule.create({
        data: {
          year,
          weekNumber,
          weekStartDate,
          weekEndDate,
          location: location ?? undefined,
          department: department ?? undefined,
          sourceDocumentId: createdDocument.id,
          importedByUserId: importedByUserId ?? ownerId,
        },
      });

      return {
        schedule,
        document: createdDocument,
      };
    } catch (error) {
      this.handleError(error, "Failed to create workforce schedule from document");
    }
  }

  private async resolveOwnerId(importedByUserId?: string | null): Promise<string> {
    if (importedByUserId) {
      return importedByUserId;
    }

    const firstActiveUser = await this.prisma.user.findFirst({
      where: { isActive: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    if (!firstActiveUser) {
      throw new Error(
        "No active users found in the system to own workforce schedule documents. Please create a user first.",
      );
    }

    return firstActiveUser.id;
  }
}

