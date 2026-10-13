/**
 * U-19: Cierre de Turno / Caja — helpers puros de la Fase 7.
 * Verifica cálculo de efectivo esperado, diferencia de caja, bucketing de
 * ventas por método y formateo de la diferencia. Sin mock de Supabase.
 */
import { describe, it, expect } from "vitest";
import {
  expectedCash,
  cashDifference,
  sumSalesByMethod,
  formatDifference,
} from "../../services/cashShiftService";
import type { CashShiftStatus } from "../../config/supabase";

describe("U-19 · cashShift — expectedCash", () => {
  it("suma fondo + ventas efectivo + propinas efectivo", () => {
    expect(expectedCash(50000, 30000, 5000)).toBe(85000);
  });

  it("sin propinas", () => {
    expect(expectedCash(20000, 15000, 0)).toBe(35000);
  });

  it("con ceros", () => {
    expect(expectedCash(0, 0, 0)).toBe(0);
  });

  it("trata NaN como 0", () => {
    expect(expectedCash(NaN, NaN, NaN)).toBe(0);
  });
});

describe("U-19 · cashShift — cashDifference", () => {
  it("positivo = sobrante", () => {
    expect(cashDifference(90000, 85000)).toBe(5000);
  });

  it("negativo = faltante", () => {
    expect(cashDifference(80000, 85000)).toBe(-5000);
  });

  it("cero = cuadrado", () => {
    expect(cashDifference(85000, 85000)).toBe(0);
  });

  it("trata NaN como 0", () => {
    expect(cashDifference(NaN, NaN)).toBe(0);
  });
});

describe("U-19 · cashShift — sumSalesByMethod", () => {
  const mk = (
    total: number,
    method: string | null,
    status = "completed",
    paymentStatus = "paid"
  ) => ({ total, payment_method: method, status, payment_status: paymentStatus });

  it("bucketiza por método de pago", () => {
    const orders = [
      mk(10000, "cash"),
      mk(20000, "card"),
      mk(15000, "transfer"),
      mk(8000, "qr"),
    ];
    const res = sumSalesByMethod(orders);
    expect(res.cash).toBe(10000);
    expect(res.card).toBe(20000);
    expect(res.transfer).toBe(15000);
    expect(res.qr).toBe(8000);
    expect(res.total).toBe(53000);
    expect(res.count).toBe(4);
  });

  it("payment_method null/vacío → bucket cash (igual que POS)", () => {
    const orders = [
      mk(10000, null),
      mk(5000, ""),
      mk(3000, "desconocido"),
    ];
    const res = sumSalesByMethod(orders);
    expect(res.cash).toBe(18000);
    expect(res.total).toBe(18000);
  });

  it("ignora pedidos cancelled/rejected", () => {
    const orders = [
      mk(10000, "cash", "completed"),
      mk(99999, "cash", "cancelled"),
      mk(88888, "card", "rejected"),
    ];
    const res = sumSalesByMethod(orders);
    expect(res.cash).toBe(10000);
    expect(res.card).toBe(0);
    expect(res.count).toBe(1);
  });

  it("ignora pedidos pendientes aunque la cocina los haya entregado", () => {
    const orders = [
      mk(10000, "cash", "completed", "paid"),
      mk(99999, "cash", "completed", "pending"),
    ];
    const res = sumSalesByMethod(orders);
    expect(res.cash).toBe(10000);
    expect(res.count).toBe(1);
  });

  it("totaliza correctamente con mezcla", () => {
    const orders = [
      mk(10000, "cash"),
      mk(25000, "qr"),
      mk(12000, "card"),
    ];
    const res = sumSalesByMethod(orders);
    expect(res.total).toBe(47000);
  });

  it("lista vacía → todo cero", () => {
    const res = sumSalesByMethod([]);
    expect(res.cash).toBe(0);
    expect(res.card).toBe(0);
    expect(res.transfer).toBe(0);
    expect(res.qr).toBe(0);
    expect(res.total).toBe(0);
    expect(res.count).toBe(0);
  });
});

describe("U-19 · cashShift — formatDifference", () => {
  it("positivo → sobrante", () => {
    expect(formatDifference(5000)).toBe("+$5.000 (sobrante)");
  });

  it("negativo → faltante", () => {
    expect(formatDifference(-3000)).toBe("-$3.000 (faltante)");
  });

  it("cero → cuadrado", () => {
    expect(formatDifference(0)).toBe("$0 (cuadrado)");
  });

  it("trata NaN como cuadrado", () => {
    expect(formatDifference(NaN)).toBe("$0 (cuadrado)");
  });
});

describe("U-19 · cashShift — tipos", () => {
  it("CashShiftStatus cubre open y closed", () => {
    const statuses: CashShiftStatus[] = ["open", "closed"];
    expect(statuses).toHaveLength(2);
  });
});
