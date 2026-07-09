import { env } from "@/lib/env";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel) {
  return levelPriority[level] >= levelPriority[env.LOG_LEVEL];
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    context: Object.fromEntries(
      Object.entries(context).map(([key, value]) => [
        key,
        key === "error" ? serializeError(value) : value,
      ])
    ),
    timestamp: new Date().toISOString(),
    service: "ribbai-ops",
    environment: env.APP_ENV,
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  console.warn(JSON.stringify(payload));
}

export const logger = {
  debug: (message: string, context?: LogContext) => writeLog("debug", message, context),
  info: (message: string, context?: LogContext) => writeLog("info", message, context),
  warn: (message: string, context?: LogContext) => writeLog("warn", message, context),
  error: (message: string, context?: LogContext) => writeLog("error", message, context),
};
