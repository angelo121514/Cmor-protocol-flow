/**
 * U-18: KDS (Kitchen Display System) — helpers puros de la Fase 6.
 * Verifica partición de pedidos en columnas, cálculo de minutos transcurridos
 * y conteo de pedidos activos. Sin mock de Supabase (solo funciones puras).
 */
import { describe, it, expect } from "vitest";
import {
  partitionOrders,
  minutesSinceAccepted,
  countActiveOrders,
} from "../../services/kdsService";
import type { Order, TableStatus, TableSessionStatus } from "../../config/supabase";

// Helper para construir un Order mínimo para los tests.
const mkOrder = (
  id: string,
  status: Order["status"],
  overrides: Partial<Order> = {}
): Order => ({
  id,
  restaurant_id: "r1",
  order_number: `ORD-${id}`,
  order_type: "qr",
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  status,
  created_at: "2026-07-14T10:00:00Z",
  ...overrides,
});

describe("U-18 · KDS — partitionOrders", () => {
  it("parte los pedidos en las 4 columnas según su estado", () => {
    const orders = [
      mkOrder("1", "pending"),
      mkOrder("2", "accepted"),
      mkOrder("3", "preparing"),
      mkOrder("4", "ready"),
    ];
    const cols = partitionOrders(orders);
    expect(cols.pending).toHaveLength(1);
    expect(cols.accepted).toHaveLength(1);
    expect(cols.preparing).toHaveLength(1);
    expect(cols.ready).toHaveLength(1);
  });

  it("ignora pedidos completed/cancelled/rejected (no van al KDS)", () => {
    const orders = [
      mkOrder("1", "completed"),
      mkOrder("2", "cancelled"),
      mkOrder("3", "rejected"),
    ];
    const cols = partitionOrders(orders);
    expect(cols.pending).toHaveLength(0);
    expect(cols.accepted).toHaveLength(0);
    expect(cols.preparing).toHaveLength(0);
    expect(cols.ready).toHaveLength(0);
  });

  it("ordena cada columna FIFO (más antiguo primero)", () => {
    const orders = [
      mkOrder("b", "pending", { created_at: "2026-07-14T10:05:00Z" }),
      mkOrder("a", "pending", { created_at: "2026-07-14T10:00:00Z" }),
      mkOrder("c", "pending", { created_at: "2026-07-14T09:55:00Z" }),
    ];
    const cols = partitionOrders(orders);
    expect(cols.pending.map((o) => o.id)).toEqual(["c", "a", "b"]);
  });

  it("retorna columnas vacías para lista vacía", () => {
    const cols = partitionOrders([]);
    expect(cols.pending).toEqual([]);
    expect(cols.accepted).toEqual([]);
    expect(cols.preparing).toEqual([]);
    expect(cols.ready).toEqual([]);
  });

  it("agrupa múltiples pedidos del mismo estado", () => {
    const orders = [
      mkOrder("1", "preparing"),
      mkOrder("2", "preparing"),
      mkOrder("3", "preparing"),
    ];
    const cols = partitionOrders(orders);
    expect(cols.preparing).toHaveLength(3);
    expect(cols.pending).toHaveLength(0);
  });
});

describe("U-18 · KDS — minutesSinceAccepted", () => {
  it("calcula minutos desde accepted_at", () => {
    const order = mkOrder("1", "accepted", {
      accepted_at: "2026-07-14T10:00:00Z",
      created_at: "2026-07-14T09:50:00Z",
    });
    const now = new Date("2026-07-14T10:15:00Z");
    expect(minutesSinceAccepted(order, now)).toBe(15);
  });

  it("usa created_at si no hay accepted_at", () => {
    const order = mkOrder("1", "pending", {
      created_at: "2026-07-14T10:00:00Z",
    });
    const now = new Date("2026-07-14T10:10:00Z");
    expect(minutesSinceAccepted(order, now)).toBe(10);
  });

  it("retorna negativo si el pedido es del futuro (reloj desfasado)", () => {
    const order = mkOrder("1", "accepted", {
      accepted_at: "2026-07-14T10:00:00Z",
    });
    const now = new Date("2026-07-14T09:50:00Z");
    expect(minutesSinceAccepted(order, now)).toBe(-10);
  });

  it("retorna 0 si accepted_at coincide con now", () => {
    const order = mkOrder("1", "accepted", {
      accepted_at: "2026-07-14T10:00:00Z",
    });
    const now = new Date("2026-07-14T10:00:00Z");
    expect(minutesSinceAccepted(order, now)).toBe(0);
  });
});

describe("U-18 · KDS — countActiveOrders", () => {
  it("cuenta solo pedidos en estados activos del KDS", () => {
    const orders = [
      mkOrder("1", "pending"),
      mkOrder("2", "accepted"),
      mkOrder("3", "preparing"),
      mkOrder("4", "ready"),
      mkOrder("5", "completed"),
      mkOrder("6", "cancelled"),
    ];
    expect(countActiveOrders(orders)).toBe(4);
  });

  it("retorna 0 si todos están completados/cancelados", () => {
    const orders = [
      mkOrder("1", "completed"),
      mkOrder("2", "rejected"),
    ];
    expect(countActiveOrders(orders)).toBe(0);
  });

  it("retorna 0 para lista vacía", () => {
    expect(countActiveOrders([])).toBe(0);
  });
});

describe("U-18 · KDS — tipos", () => {
  it("TableStatus cubre los 4 estados de mesa", () => {
    const statuses: TableStatus[] = ["available", "occupied", "reserved", "cleaning"];
    expect(statuses).toHaveLength(4);
  });

  it("TableSessionStatus cubre los 3 estados de sesión", () => {
    const statuses: TableSessionStatus[] = ["active", "payment_pending", "closed"];
    expect(statuses).toHaveLength(3);
  });

  it("Order acepta los 7 estados de cocina", () => {
    const statuses: Order["status"][] = [
      "pending",
      "accepted",
      "preparing",
      "ready",
      "completed",
      "cancelled",
      "rejected",
    ];
    expect(statuses).toHaveLength(7);
  });
});
