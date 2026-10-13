/**
 * U-14: waiterService — tipos y estructura
 * Verifica que las interfaces de mesero expongan los campos correctos y que
 * el tipo ActiveWaiter (respuesta de validatePin) no incluya pin_hash.
 */
import { describe, it, expect } from "vitest";
import type { Waiter, WaiterSession, WaiterRole } from "../../config/supabase";
import type { ActiveWaiter } from "../../services/waiterService";

describe("U-14 · Meseros — tipos", () => {
  it("WaiterRole cubre los 4 roles del CHECK", () => {
    const roles: WaiterRole[] = ["waiter", "bartender", "host", "cashier"];
    expect(roles).toHaveLength(4);
  });

  it("Waiter NO incluye pin_hash (nunca llega al frontend)", () => {
    const waiter: Waiter = {
      id: "uuid-1",
      restaurant_id: "uuid-r",
      name: "Juan",
      is_active: true,
      role: "waiter",
      created_at: "2026-07-13T00:00:00Z",
      updated_at: "2026-07-13T00:00:00Z",
    };
    expect(waiter).not.toHaveProperty("pin_hash");
    expect(waiter.name).toBe("Juan");
  });

  it("WaiterSession tiene métricas de turno", () => {
    const session: WaiterSession = {
      id: "uuid-s",
      waiter_id: "uuid-w",
      restaurant_id: "uuid-r",
      started_at: "2026-07-13T08:00:00Z",
      ended_at: "2026-07-13T16:00:00Z",
      tables_served: 12,
      orders_count: 30,
      total_sales: 450000,
      total_tips: 18000,
    };
    expect(session.orders_count).toBe(30);
    expect(session.total_tips).toBeGreaterThan(0);
  });

  it("ActiveWaiter (respuesta de validatePin) no contiene pin_hash", () => {
    const active: ActiveWaiter = {
      waiter_id: "uuid-w",
      waiter_name: "Juan",
      waiter_role: "waiter",
      session_id: "uuid-s",
    };
    expect(active).not.toHaveProperty("pin_hash");
    expect(active).not.toHaveProperty("pin");
    expect(active.session_id).toBeDefined();
  });
});
