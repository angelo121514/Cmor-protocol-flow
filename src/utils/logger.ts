/**
 * Logger estructurado — Fase 0 Setup
 * Reemplaza console.log/error en producción.
 * En desarrollo, usa console normal.
 * En producción, envía a Sentry sin PII.
 */
import { Sentry } from "../instrumentation";
import {redactTelemetry,redactText} from "./telemetry";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  [key: string]: unknown;
}

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

const redactPii = (context:LogContext):LogContext => redactTelemetry(context);

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const redactedContext = context ? redactPii(context) : undefined;
  if (redactedContext && Object.keys(redactedContext).length > 0) {
    return `[${timestamp}] ${level.toUpperCase()}: ${redactText(message)} ${JSON.stringify(redactedContext)}`;
  }
  return `[${timestamp}] ${level.toUpperCase()}: ${redactText(message)}`;
}

export const logger = {
  info(message: string, context?: LogContext): void {
    if (isDev) {
      console.log(formatMessage("info", message, context));
    }
    // En prod, no enviar info a Sentry (mucho ruido)
  },

  warn(message: string, context?: LogContext): void {
    if (isDev) {
      console.warn(formatMessage("warn", message, context));
    }
    if (isProd) {
      Sentry.captureMessage(redactText(message), {
        level: "warning",
        extra: context ? redactPii(context) : undefined,
      });
    }
  },

  error(message: string, context?: LogContext, error?: Error): void {
    if (isDev) {
      console.error(formatMessage("error", message, context), error ? redactTelemetry(error) : undefined);
    }
    if (isProd) {
      Sentry.captureException(new Error(redactText(error?.message || message)), {
        extra: context ? redactPii(context) : undefined,
      });
    }
  },

  debug(message: string, context?: LogContext): void {
    if (isDev) {
      console.debug(formatMessage("debug", message, context));
    }
    // Debug nunca se envía a Sentry en prod
  },
};
