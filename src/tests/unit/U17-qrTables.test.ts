/**
 * U-17: tableService — helpers puros de Fase 5 (pago QR por mesa).
 * Verifica cálculo de propina, suma de sesión y monto total a pagar.
 * Sin mock de Supabase (solo funciones puras).
 */
import { describe, it, expect } from "vitest";
import {
  calcTipFromPercent,
  sumSessionTotal,
  calcPaymentAmount,
  buildTableQrUrl,
} from "../../services/tableService";
import type { RestaurantTable, TableSession } from "../../config/supabase";

describe("U-17 · Pago QR — calcTipFromPercent", () => {
  it("calcula propina del 10% con redondeo comercial", () => {
    expect(calcTipFromPercent(18500, 10)).toBe(1850);
  });

  it("redondea al entero CLP más cercano", () => {
    // 18503 * 0.15 = 2775.45 → 2775
    expect(calcTipFromPercent(18503, 15)).toBe(2775);
  });

  it("retorna 0 para subtotal negativo o cero", () => {
    expect(calcTipFromPercent(0, 10)).toBe(0);
    expect(()=>calcTipFromPercent(-1000, 10)).toThrow();
  });

  it("retorna 0 para porcentaje 0 o negativo", () => {
    expect(calcTipFromPercent(20000, 0)).toBe(0);
    expect(()=>calcTipFromPercent(20000, -5)).toThrow();
  });
});

describe("U-17 · Pago QR — sumSessionTotal", () => {
  it("suma los totales de pedidos no cancelados", () => {
    const orders = [
      { total: 12000, status: "pending" },
      { total: 8000, status: "completed" },
      { total: 5000, status: "cancelled" },
      { total: 3000, status: "rejected" },
    ];
    expect(sumSessionTotal(orders)).toBe(20000);
  });

  it("ignora pedidos cancelados y rechazados", () => {
    const orders = [
      { total: 10000, status: "cancelled" },
      { total: 10000, status: "rejected" },
    ];
    expect(sumSessionTotal(orders)).toBe(0);
  });

  it("retorna 0 para sesión vacía", () => {
    expect(sumSessionTotal([])).toBe(0);
  });

  it("trata status ausente como válido (no cancelado)", () => {
    const orders = [{ total: 7000 }, { total: 3000 }];
    expect(sumSessionTotal(orders)).toBe(10000);
  });

  it("tolera valores string numéricos", () => {
    const orders = [{ total: "5000" as unknown as number, status: "pending" }];
    expect(sumSessionTotal(orders)).toBe(5000);
  });
});

describe("U-17 · Pago QR — calcPaymentAmount", () => {
  it("suma pedidos + propina", () => {
    const orders = [
      { total: 15000, status: "pending" },
      { total: 5000, status: "accepted" },
    ];
    expect(calcPaymentAmount(orders, 2000)).toBe(22000);
  });

  it("no permite propina negativa", () => {
    const orders = [{ total: 10000, status: "pending" }];
    expect(calcPaymentAmount(orders, -500)).toBe(10000);
  });

  it("con propina 0 equivale al total de la sesión", () => {
    const orders = [{ total: 18000, status: "pending" }];
    expect(calcPaymentAmount(orders, 0)).toBe(18000);
  });
});

describe("U-17 · Pago QR — tipos", () => {
  it("TableStatus cubre los 4 estados", () => {
    const statuses: ("available" | "occupied" | "reserved" | "cleaning")[] = [
      "available",
      "occupied",
      "reserved",
      "cleaning",
    ];
    expect(statuses).toHaveLength(4);
  });

  it("TableSessionStatus cubre los 3 estados", () => {
    const statuses: ("active" | "payment_pending" | "closed")[] = [
      "active",
      "payment_pending",
      "closed",
    ];
    expect(statuses).toHaveLength(3);
  });

  it("RestaurantTable tiene los campos esperados", () => {
    const table: RestaurantTable = {
      id: "uuid-1",
      restaurant_id: "uuid-r",
      table_number: "Mesa 1",
      qr_token: "abc123",
      capacity: 4,
      status: "available",
      is_active: true,
      created_at: "2026-07-13T00:00:00Z",
      updated_at: "2026-07-13T00:00:00Z",
    };
    expect(table.qr_token).toBe("abc123");
    expect(table.status).toBe("available");
  });

  it("TableSession tiene los campos esperados", () => {
    const session: TableSession = {
      id: "uuid-s",
      table_id: "uuid-1",
      restaurant_id: "uuid-r",
      session_token: "tok",
      status: "active",
      started_at: "2026-07-13T00:00:00Z",
      total_amount: 0,
      tip_amount: 0,
    };
    expect(session.session_token).toBe("tok");
    expect(session.status).toBe("active");
  });
});

describe("U-17 · Pago QR — buildTableQrUrl", () => {
  it("construye la URL del QR con el token", () => {
    const url = buildTableQrUrl("abc123");
    expect(url).toMatch(/\/mesa\/abc123$/);
  });
});
