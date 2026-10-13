/**
 * Sentry initialization — Fase 0 Setup
 * Importar ANTES que App.tsx en src/main.tsx
 *
 * Captura errores frontend con redacción de PII.
 * Release tracking activado para asociar errores a deploys.
 */
import * as Sentry from "@sentry/react";
import {redactTelemetry,sensitiveRoute} from "./utils/telemetry";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

// No inicializar Sentry si no hay DSN (modo dev sin monitoreo)
if (SENTRY_DSN && SENTRY_DSN.startsWith("https://") && !sensitiveRoute(window.location.pathname)) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `cmor-flow@${APP_VERSION}`,
    // 10% de transacciones para performance monitoring
    tracesSampleRate: 0.1,
    // Capturar sesiones con errores para replays
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Redactar texto de inputs y textareas
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Redactar PII antes de enviar
    beforeSend(event) {
      if(sensitiveRoute(window.location.pathname))return null;
      if(event.request){delete event.request.headers;delete event.request.cookies;delete event.request.data;}
      delete event.user;
      return redactTelemetry(event);
    },
    beforeSendTransaction(event){return sensitiveRoute(window.location.pathname)?null:redactTelemetry(event);},
    beforeBreadcrumb(crumb){return sensitiveRoute(window.location.pathname)?null:redactTelemetry(crumb);},
    // Ignorar errores conocidos que no aportan valor
    ignoreErrors: [
      // Extensiones de navegador
      "top.GLOBALS",
      "ResizeObserver loop limit exceeded",
      // Network errors que el usuario ya ve
      "Network request failed",
      "Failed to fetch",
      // Cancelaciones de fetch
      "AbortError",
    ],
  });
}

export { Sentry };
