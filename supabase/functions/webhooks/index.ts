import "../_shared/local-network.ts";
// =====================================================================
// Edge Function: webhooks — Router
// Enruta las llamadas de webhooks (Webpay, etc.) a sus respectivos
// manejadores basándose en la ruta de la URL.
// =====================================================================
import { handleOptions } from "../_shared/cors.ts";
import { handler as webpayHandler } from "./webpay/index.ts";
import { handler as flowHandler } from "./flow/index.ts";

Deno.serve(async (req) => {
  // Manejo de CORS preflight
  // Provider callbacks authenticate their remote transaction, independently of Origin.
  const options = handleOptions(req, false);
  if (options) return options;

  const url = new URL(req.url);
  const path = url.pathname;

  console.log(`[webhooks-router] Recibida petición: ${req.method} ${path}`);

  // Enrutar a Webpay
  if (path.endsWith("/webpay") || path.includes("/webhooks/webpay")) {
    return await webpayHandler(req);
  }

  // Enrutar a Flow
  if (path.endsWith("/flow") || path.includes("/webhooks/flow")) {
    return await flowHandler(req);
  }

  return new Response(
    JSON.stringify({ error: "webhook route not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
});
