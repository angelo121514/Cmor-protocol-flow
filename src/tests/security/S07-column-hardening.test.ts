/**
 * S-07: Regresión de los hallazgos críticos de la auditoría 2026-08-28.
 *
 *   S-1: el cliente ya no activa planes con UPDATE directo (fake checkout
 *        eliminado; checkout real vía Flow).
 *   S-2: la migración de hardening no otorga UPDATE de tabla completa en
 *        profiles (role) ni restaurants (plan/estado).
 *   S-3: los selects de restaurantes del cliente usan columnas explícitas
 *        sin columnas sensibles (kitchen_*, flow_*, internal_notes...).
 *
 * Los archivos fuente se leen con import.meta.glob(?raw) para no depender
 * de tipos de Node (tsconfig.app restringe types a vite/client).
 */
import { describe, it, expect } from "vitest";

const sources = import.meta.glob("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const readSrc = (sub: string): string => {
  const key = Object.keys(sources).find((k) => k.endsWith(sub));
  expect(key, `archivo no encontrado: ${sub}`).toBeTruthy();
  return sources[key!]!;
};

const migrations = import.meta.glob("/supabase/migrations/20260828*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const readMig = (name: string): string => {
  const key = Object.keys(migrations).find((k) => k.includes(name));
  expect(key, `migración no encontrada: ${name}`).toBeTruthy();
  return migrations[key!]!;
};

describe("S-07 · hardening por columna (auditoría 2026-08-28)", () => {
  it("S-3: RESTAURANT_COLUMNS no contiene columnas sensibles", async () => {
    const { RESTAURANT_COLUMNS } = await import("../../config/supabase");
    const forbidden = [
      "kitchen_pin_hash",
      "kitchen_token",
      "kitchen_token_expires_at",
      "flow_customer_id",
      "flow_subscription_id",
      "internal_notes",
      "block_reason",
    ];
    for (const col of forbidden) {
      expect(RESTAURANT_COLUMNS).not.toContain(col);
    }
    // El plan se lee (para mostrar el estado del trial) pero su escritura
    // está bloqueada server-side.
    expect(RESTAURANT_COLUMNS).toContain("subscription_plan");
  });

  it("S-1: RestaurantSettings ya no contiene el fake checkout", () => {
    const settings = readSrc("RestaurantSettings.tsx");
    expect(settings).not.toContain("pago simulado");
    expect(settings).not.toMatch(/\.update\(\s*\{[^}]*subscription_plan/s);
    expect(settings).toContain("useFlowSubscription");
  });

  it("S-1: ningún servicio/página escribe subscription_plan en restaurants", () => {
    const files = [
      "pages/restaurant/Pos.tsx",
      "pages/restaurant/RestaurantSettings.tsx",
      "hooks/useAuth.ts",
      "services/restaurantService.ts",
      "services/flowService.ts",
    ];
    const forbidden = /subscription_plan\s*:/;
    for (const file of files) {
      const content = readSrc(file);
      // Updates a la tabla restaurants (los payload de RPC no aplican).
      const updates = content.match(/\.update\(\s*\{[\s\S]*?\}\s*\)\s*\.eq\(\s*["']id["']/g) ?? [];
      for (const u of updates) {
        expect(forbidden.test(u), `update con subscription_plan en ${file}`).toBe(false);
      }
    }
  });

  it("S-2: la migración revoca UPDATE/INSERT/DELETE en profiles y usa grants por columna", () => {
    const sql = readMig("audit_lock_sensitive_columns");
    expect(sql).toMatch(
      /REVOKE INSERT, DELETE, UPDATE ON TABLE public\.profiles FROM anon, authenticated/
    );
    expect(sql).toMatch(/GRANT UPDATE \(display_name\) ON TABLE public\.profiles TO authenticated/);
    expect(sql).toMatch(/GRANT UPDATE \(/);
    expect(sql).not.toMatch(/GRANT UPDATE ON TABLE public\.restaurants/);
  });
});
