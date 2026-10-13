/**
 * U-02: helpers.isValidPhone()
 * Corregido (auditoría 2026-08-28): el regex era para India; ahora acepta
 * formato chileno (+56 9XXXXXXXX / 9XXXXXXXX) y genérico de 8+ dígitos.
 */
import { describe, it, expect } from "vitest";
import { isValidPhone } from "../../utils/helpers";

describe("U-02 · isValidPhone (corregido)", () => {
  it("acepta teléfono chileno con +56 y nacional de 9 dígitos", () => {
    expect(isValidPhone("+56900000000")).toBe(true);
    expect(isValidPhone("+56900000000")).toBe(true);
    expect(isValidPhone("912345678")).toBe(true);
  });

  it("acepta teléfonos fijos de 8 dígitos y formatos con separadores", () => {
    expect(isValidPhone("22345678")).toBe(true);
    expect(isValidPhone("(22) 345-6789")).toBe(true);
  });

  it("rechaza formatos inválidos", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("abcdefghij")).toBe(false);
    expect(isValidPhone("912345678901234")).toBe(false); // demasiado largo
  });
});
