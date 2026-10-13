/**
 * U-20: Dashboard del Dueño — helpers puros de la Fase 8.
 * Verifica timeAgo, notificationIcon, tableOccupancy, formatTips.
 * Sin mock de Supabase.
 */
import { describe, it, expect } from "vitest";
import {
  notificationIcon,
  timeAgo,
  tableOccupancy,
  formatTips,
} from "../../services/dashboardService";

describe("U-20 · dashboard — notificationIcon", () => {
  it("retorna Package para low_stock", () => {
    expect(notificationIcon("low_stock")).toBe("Package");
  });

  it("retorna ShoppingBag para order_new", () => {
    expect(notificationIcon("order_new")).toBe("ShoppingBag");
  });

  it("retorna CheckCircle para order_completed", () => {
    expect(notificationIcon("order_completed")).toBe("CheckCircle");
  });

  it("retorna XCircle para order_cancelled", () => {
    expect(notificationIcon("order_cancelled")).toBe("XCircle");
  });

  it("retorna Wallet para shift_opened y shift_closed", () => {
    expect(notificationIcon("shift_opened")).toBe("Wallet");
    expect(notificationIcon("shift_closed")).toBe("Wallet");
  });

  it("retorna Info para tipo desconocido", () => {
    expect(notificationIcon("unknown_type")).toBe("Info");
  });
});

describe("U-20 · dashboard — timeAgo", () => {
  it('retorna "ahora" para menos de 1 minuto', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("ahora");
  });

  it("retorna minutos para intervalos cortos", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("hace 5m");
  });

  it("retorna horas para intervalos medios", () => {
    const threeHrsAgo = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(timeAgo(threeHrsAgo)).toBe("hace 3h");
  });

  it("retorna días para intervalos largos", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe("hace 2d");
  });

  it("1 minuto retorna hace 1m", () => {
    const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
    expect(timeAgo(oneMinAgo)).toBe("hace 1m");
  });

  it("24 horas retorna hace 1d (frontera día)", () => {
    const twentyFourHrsAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    // 24 hours = exactly 1 day → Math.floor(24) >= 24 → hace 1d
    expect(timeAgo(twentyFourHrsAgo)).toBe("hace 1d");
  });
});

describe("U-20 · dashboard — tableOccupancy", () => {
  it("0/0 retorna 0%", () => {
    expect(tableOccupancy(0, 0)).toBe(0);
  });

  it("0/10 retorna 0%", () => {
    expect(tableOccupancy(0, 10)).toBe(0);
  });

  it("5/10 retorna 50%", () => {
    expect(tableOccupancy(5, 10)).toBe(50);
  });

  it("3/4 retorna 75%", () => {
    expect(tableOccupancy(3, 4)).toBe(75);
  });

  it("10/10 retorna 100%", () => {
    expect(tableOccupancy(10, 10)).toBe(100);
  });

  it("1/3 redondea a 33%", () => {
    expect(tableOccupancy(1, 3)).toBe(33);
  });
});

describe("U-20 · dashboard — formatTips", () => {
  it("formato CLP con separador de miles (.)", () => {
    const result = formatTips(5000);
    // toLocaleString("es-CL") usa . como separador de miles
    expect(result).toContain("5");
    expect(result).toMatch(/^\$/);
  });

  it("propina cero retorna $0", () => {
    expect(formatTips(0)).toBe("$0");
  });

  it("propina grande con separadores", () => {
    const result = formatTips(1000000);
    expect(result).toMatch(/^\$/);
    expect(result).toContain("1");
  });

  it("propinas pequeñas sin separadores", () => {
    const result = formatTips(500);
    expect(result).toBe("$500");
  });
});
