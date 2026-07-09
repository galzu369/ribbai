import { ZodError } from "zod";

import { ApplicationError, isApplicationError } from "./application-error";

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function normalizeError(error: unknown): ApplicationError {
  if (isApplicationError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ApplicationError("Validation failed", "VALIDATION_ERROR", 400, error.flatten());
  }

  if (error instanceof Error) {
    return new ApplicationError(error.message);
  }

  return new ApplicationError("An unknown error occurred");
}

export function toErrorResponse(error: unknown): ErrorResponse {
  const normalizedError = normalizeError(error);

  return {
    error: {
      code: normalizedError.code,
      message: normalizedError.message,
      details: normalizedError.details,
    },
  };
}
