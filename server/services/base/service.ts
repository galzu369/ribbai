import { normalizeError } from "@/lib/errors";
import { logger } from "@/lib/logging";

export type ServiceContext = {
  actorId?: string;
  requestId?: string;
};

export abstract class BaseService {
  protected readonly context: ServiceContext;

  protected constructor(context: ServiceContext = {}) {
    this.context = context;
  }

  protected handleError(error: unknown, message: string): never {
    const normalizedError = normalizeError(error);

    logger.error(message, {
      error: normalizedError,
      actorId: this.context.actorId,
      requestId: this.context.requestId,
    });

    throw normalizedError;
  }
}
