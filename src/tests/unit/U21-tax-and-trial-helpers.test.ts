/**
 * U-21: helpers añadidos/corregidos en la auditoría 2026-08-28.
 *  - splitTaxFromTotal: IVA desglosado desde APP_CONFIG.taxRate (única
 *    fuente; antes había 4 literales 1.19 duplicados).
 *  - getTrialDaysLeft / isTrialExpired: fuente única del cálculo de trial.
 */
import { describe, it, expect } from "vitest";
import {
  splitTaxFromTotal,
  getTrialDaysLeft,
  isTrialExpired,
} from "../../utils/helpers";

describe("U-21 · splitTaxFromTotal (IVA Chile 19%)", () => {
  it("desglosa un total con IVA incluido", () => {
    // 11900 CLP con IVA 19% → neto 10000, IVA 1900
    const { subtotal, tax, total } = splitTaxFromTotal(11900);
    expect(subtotal).toBe(10000);
    expect(tax).toBe(1900);
    expect(total).toBe(11900);
  });

  it("redondea a pesos enteros (CLP)", () => {
    // 1000 / 1.19 = 840.336… → neto 840, IVA 160, total 1000
    const { subtotal, tax, total } = splitTaxFromTotal(1000);
    expect(subtotal + tax).toBe(total);
    expect(Number.isInteger(subtotal)).toBe(true);
    expect(Number.isInteger(tax)).toBe(true);
  });

  it("rechaza entradas no finitas", () => {
    expect(()=>splitTaxFromTotal(NaN)).toThrow("invalid_tax_input");
  });
});

describe("U-21 · getTrialDaysLeft / isTrialExpired", () => {
  it("devuelve 0 sin fecha o con fecha pasada", () => {
    expect(getTrialDaysLeft(null)).toBe(0);
    expect(getTrialDaysLeft(undefined)).toBe(0);
    expect(getTrialDaysLeft("2020-01-01T00:00:00Z")).toBe(0);
  });

  it("devuelve días restantes (ceil) para fechas futuras", () => {
    const in23h = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    expect(getTrialDaysLeft(in23h)).toBe(1);
    const in8d = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(getTrialDaysLeft(in8d)).toBe(8);
  });

  it("isTrialExpired sólo es true para free_trial vencido", () => {
    expect(isTrialExpired("free_trial", "2020-01-01T00:00:00Z")).toBe(true);
    expect(isTrialExpired("free_trial", null)).toBe(false);
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(isTrialExpired("free_trial", future)).toBe(false);
    expect(isTrialExpired("pro", "2020-01-01T00:00:00Z")).toBe(false);
  });
});
