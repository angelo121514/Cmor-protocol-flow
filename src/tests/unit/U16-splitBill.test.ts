/**
 * U-16: splitBillService — helpers de cálculo puros
 * Verifica splitEqually y validateSplitTotals (sin mock de Supabase).
 */
import { describe, it, expect } from "vitest";
import { splitEqually, validateSplitTotals } from "../../services/splitBillService";
import type { OrderPayment, SplitPaymentMethod, SplitPaymentStatus } from "../../config/supabase";

describe("U-16 · División — splitEqually", () => {
  it("divide monto exacto en partes iguales", () => {
    const { parts, remainder } = splitEqually(30000, 3);
    expect(parts).toEqual([10000, 10000, 10000]);
    expect(remainder).toBe(0);
  });

  it("divide con resto (10000 / 3)", () => {
    const { parts, remainder } = splitEqually(10000, 3);
    expect(parts).toEqual([3334, 3333, 3333]);
    expect(remainder).toBe(0);
  });

  it("retorna array vacío para 0 personas", () => {
    const { parts, remainder } = splitEqually(5000, 0);
    expect(parts).toEqual([]);
    expect(remainder).toBe(5000);
  });

  it("maneja 1 persona", () => {
    const { parts, remainder } = splitEqually(5000, 1);
    expect(parts).toEqual([5000]);
    expect(remainder).toBe(0);
  });
});

describe("U-16 · División — validateSplitTotals", () => {
  it("valida suma exacta", () => {
    const result = validateSplitTotals([10000, 15000, 5000], 30000);
    expect(result.valid).toBe(true);
    expect(result.sum).toBe(30000);
    expect(result.difference).toBe(0);
  });

  it("detecta diferencia negativa (falta dinero)", () => {
    const result = validateSplitTotals([10000, 10000], 30000);
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(10000);
  });

  it("detecta diferencia positiva (sobra dinero)", () => {
    const result = validateSplitTotals([20000, 20000], 30000);
    expect(result.valid).toBe(false);
    expect(result.difference).toBe(-10000);
  });

  it("rechaza diferencia de una unidad mínima", () => {
    const result = validateSplitTotals([10001], 10000);
    expect(result.valid).toBe(false);
  });

  it.each([NaN, Infinity, -Infinity, -1, 0, 1.001])("rechaza parte inválida %s sin lanzar excepción", value => {
    expect(validateSplitTotals([value], 1, 2).valid).toBe(false);
  });
  it("no redondea una parte manual para ocultar fracciones de unidad mínima", () => {
    expect(validateSplitTotals([0.005, 0.995], 1, 2).valid).toBe(false);
    expect(validateSplitTotals([0.01, 0.99], 1, 2).valid).toBe(true);
  });

  it("acepta suma vacía como inválida (si total > 0)", () => {
    const result = validateSplitTotals([], 5000);
    expect(result.valid).toBe(false);
  });
});

describe("U-16 · División — tipos", () => {
  it("SplitPaymentMethod cubre los 4 métodos", () => {
    const methods: SplitPaymentMethod[] = ["cash", "card", "transfer", "qr"];
    expect(methods).toHaveLength(4);
  });

  it("SplitPaymentStatus cubre los 4 estados", () => {
    const statuses: SplitPaymentStatus[] = ["pending", "paid", "failed", "refunded"];
    expect(statuses).toHaveLength(4);
  });

  it("OrderPayment tiene los campos de la tabla", () => {
    const payment: OrderPayment = {
      id: "uuid-1",
      order_id: "uuid-o",
      restaurant_id: "uuid-r",
      payment_number: 1,
      amount: 15000,
      tip_amount: 0,
      payment_method: "cash",
      payment_status: "paid",
      payer_label: "Persona 1",
      created_at: "2026-07-13T00:00:00Z",
    };
    expect(payment.amount).toBeGreaterThan(0);
    expect(payment.payment_method).toBe("cash");
  });
});
