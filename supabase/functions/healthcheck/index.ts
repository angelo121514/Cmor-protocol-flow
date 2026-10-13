import "../_shared/local-network.ts";
// =====================================================================
// Edge Function: healthcheck
// ----------------------------------------------------------------------
// Public healthcheck endpoint for monitoring.
// Verifies: Supabase DB connection, Auth, Edge Functions reachable.
// No auth required (public monitoring).
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import {
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Admin client for health checks
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Quick DB query to verify connectivity
async function checkDatabase() {
  const start = performance.now();
  const { error } = await supabase.from("restaurants").select("id").limit(1);
  const latencyMs = Math.round(performance.now() - start);
  
  if (error) {
    return { ok: false, latencyMs, error: error.message };
  }
  return { ok: true, latencyMs };
}

// Quick Auth check (verify we can reach auth admin)
async function checkAuth() {
  const start = performance.now();
  try {
    // Lightweight call: list users (limit 1)
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    const latencyMs = Math.round(performance.now() - start);
    
    if (error) {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: true, latencyMs };
  } catch (err) {
    return { ok: false, latencyMs: Math.round(performance.now() - start), error: String(err) };
  }
}

// Check other edge functions are deployed (optional, best effort)
async function checkEdgeFunctions(): Promise<Record<string,{ok:boolean;status:number;error?:string}>> {
  const functions = [
    "invite-owner",
    "create-payment-intent",
    "flow-checkout",
    "flow-subscription",
    "webhooks",
  ];

  const entries = await Promise.all(
    functions.map(async (fn) => {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
          method: "OPTIONS",
          headers: { "Authorization": `Bearer ${SERVICE_ROLE}` },
          signal: AbortSignal.timeout(5000),
        });
        return [fn, { ok: resp.ok, status: resp.status }] as const;
      } catch (err) {
        return [fn, { ok: false, status: 0, error: String(err) }] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const startTotal = performance.now();
  const checks = {
    database: await checkDatabase(),
    auth: await checkAuth(),
    edgeFunctions: await checkEdgeFunctions(),
  };

  const totalLatencyMs = Math.round(performance.now() - startTotal);
  
  const allOk = checks.database.ok && checks.auth.ok;
  const edgeFns = checks.edgeFunctions;
  const edgeOk = Object.values(edgeFns).every(f => f.ok);
  
  const status = allOk ? 200 : 503;
  
  const response = {
    ok: allOk,
    status: allOk ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    version: Deno.env.get("APP_VERSION") || "unknown",
    environment: Deno.env.get("APP_ENV") || "production",
    latencyMs: totalLatencyMs,
    checks: {
      database: {
        status: checks.database.ok ? "up" : "down",
        latencyMs: checks.database.latencyMs,
        error: checks.database.error,
      },
      auth: {
        status: checks.auth.ok ? "up" : "down",
        latencyMs: checks.auth.latencyMs,
        error: checks.auth.error,
      },
      edgeFunctions: {
        status: edgeOk ? "up" : "degraded",
        details: edgeFns,
      },
    },
  };

  return jsonResponse(req, response, status);
});
