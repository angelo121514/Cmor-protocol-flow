/**
 * U-13: inventoryService / _shared helpers
 * Verifica el manejo de errores de autorización (42501) y la normalización
 * de errores de servicio, que es la base sobre la que se apoyan las RPC
 * SECURITY DEFINER del módulo de inventario.
 */
import { describe, it, expect } from "vitest";
import {
  isUnauthorized,
  toServiceError,
  AUTH_ERROR_MESSAGE,
} from "../../services/_shared";
import type { InventoryItem, InventoryMovementType, InventoryUnit } from "../../config/supabase";

describe("U-13 · Inventario — helpers de error", () => {
  it("isUnauthorized detecta error 42501 por code", () => {
    expect(isUnauthorized({ code: "42501", message: "unauthorized" })).toBe(true);
  });

  it("isUnauthorized detecta error 42501 por message", () => {
    expect(isUnauthorized({ message: "Error: unauthorized (42501)" })).toBe(true);
  });

  it("isUnauthorized retorna false para error genérico", () => {
    expect(isUnauthorized({ message: "network error" })).toBe(false);
    expect(isUnauthorized(null)).toBe(false);
    expect(isUnauthorized(undefined)).toBe(false);
  });

  it("toServiceError normaliza 42501 al mensaje estándar", () => {
    const result = toServiceError({ code: "42501", message: "unauthorized" });
    expect(result.code).toBe("42501");
    expect(result.message).toBe(AUTH_ERROR_MESSAGE);
  });

  it("toServiceError preserva mensaje de error genérico", () => {
    const result = toServiceError({ message: "order not found" });
    expect(result.message).toBe("order not found");
    expect(result.code).toBeUndefined();
  });

  it("toServiceError maneja valores no-objeto", () => {
    const result = toServiceError("string error");
    expect(result.message).toBe("string error");
  });
});

describe("U-13 · Inventario — tipos y constantes", () => {
  it("InventoryUnit cubre las 6 unidades del CHECK de la migración", () => {
    const units: InventoryUnit[] = ["kg", "g", "l", "ml", "unidad", "porcion"];
    expect(units).toHaveLength(6);
  });

  it("InventoryMovementType cubre los 5 tipos del CHECK", () => {
    const types: InventoryMovementType[] = [
      "purchase",
      "sale_deduction",
      "manual_adjustment",
      "waste",
      "return",
    ];
    expect(types).toHaveLength(5);
  });

  it("InventoryItem tiene los campos de la tabla", () => {
    const item: InventoryItem = {
      id: "uuid-1",
      restaurant_id: "uuid-r",
      name: "Harina",
      unit: "kg",
      current_stock: 10,
      min_stock: 2,
      cost_per_unit: 1200,
      category: "Secos",
      is_active: true,
      created_at: "2026-07-13T00:00:00Z",
      updated_at: "2026-07-13T00:00:00Z",
    };
    expect(item.name).toBe("Harina");
    expect(item.unit).toBe("kg");
    expect(item.current_stock).toBeGreaterThan(item.min_stock);
  });
});
