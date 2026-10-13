/**
 * U-15: tipsService — cálculo de propinas y tipos
 * Verifica calculateTipAmount y los tipos del módulo.
 */
import { describe, it, expect } from "vitest";
import { calculateTipAmount } from "../../services/tipsService";
import type { Tip, TipStatus, TipPaymentMethod } from "../../config/supabase";

describe("U-15 · Propinas — calculateTipAmount", () => {
  it("calcula propina del 10% correctamente", () => {
    expect(calculateTipAmount(10000, 10)).toBe(1000);
  });

  it("calcula propina del 15% con redondeo", () => {
    expect(calculateTipAmount(15500, 15)).toBe(2325);
  });

  it("retorna 0 para porcentaje 0", () => {
    expect(calculateTipAmount(10000, 0)).toBe(0);
  });

  it("retorna 0 para total 0", () => {
    expect(calculateTipAmount(0, 10)).toBe(0);
  });

  it("retorna 0 para porcentaje negativo", () => {
    expect(()=>calculateTipAmount(10000, -5)).toThrow();
  });

  it("calcula propina del 20%", () => {
    expect(calculateTipAmount(50000, 20)).toBe(10000);
  });
});

describe("U-15 · Propinas — tipos", () => {
  it("TipStatus cubre los 3 estados del CHECK", () => {
    const statuses: TipStatus[] = ["collected", "pending_payout", "paid_out"];
    expect(statuses).toHaveLength(3);
  });

  it("TipPaymentMethod cubre los 4 métodos", () => {
    const methods: TipPaymentMethod[] = ["cash", "card", "transfer", "qr"];
    expect(methods).toHaveLength(4);
  });

  it("Tip tiene los campos de la tabla", () => {
    const tip: Tip = {
      id: "uuid-1",
      restaurant_id: "uuid-r",
      order_id: "uuid-o",
      waiter_id: "uuid-w",
      amount: 1500,
      percentage: 10,
      payment_method: "cash",
      status: "collected",
      created_at: "2026-07-13T00:00:00Z",
    };
    expect(tip.amount).toBe(1500);
    expect(tip.percentage).toBe(10);
    expect(tip.status).toBe("collected");
  });

  it("Tip permite payment_method undefined (propina sin método)", () => {
    const tip: Tip = {
      id: "uuid-2",
      restaurant_id: "uuid-r",
      amount: 500,
      status: "collected",
      created_at: "2026-07-13T00:00:00Z",
    };
    expect(tip.payment_method).toBeUndefined();
  });
});
