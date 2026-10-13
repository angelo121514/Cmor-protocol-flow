import { supabase } from "../config/supabase";
import type { CashShift } from "../config/supabase";
import { toServiceError, type ServiceError } from "./_shared";
import { formatCurrency } from "../utils/helpers";

// ---------------------------------------------------------------------------
// Cierre de Turno / Caja — Fase 7
// ---------------------------------------------------------------------------
// Un turno de caja se abre con un fondo inicial y se cierra con el conteo
// real del efectivo. Los totales por método de pago y el waiter_summary los
// calcula la RPC close_cash_shift server-side (no son manipulables desde el
// frontend). El helper sumSalesByMethod solo se usa para un *preview* en vivo
// mientras el turno está abierto (polling sobre orders), nunca como fuente de
// verdad para el cierre.
// ---------------------------------------------------------------------------

export type SalesByMethod = {
  cash: number;
  card: number;
  transfer: number;
  qr: number;
  total: number;
  count: number;
};

// === Llamadas a RPC / BD (owner, RLS) ======================================

/**
 * open_cash_shift: abre un turno. Idempotente: si ya hay uno abierto, la RPC
 * lo retorna sin duplicar.
 */
export const openShift = async (
  restaurantId: string,
  openingCash: number,
  notes?: string,
  responsibleWaiterId?: string
): Promise<{ data: CashShift | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("open_cash_shift", {
    p_restaurant_id: restaurantId,
    p_opening_cash: openingCash,
    p_notes: notes ?? null,
    p_responsible_waiter_id: responsibleWaiterId ?? null,
  });
  if (error) return { data: null, error: toServiceError(error) };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row as CashShift) ?? null, error: null };
};

/**
 * Turno activo (status='open') del restaurante, o null si no hay ninguno.
 */
export const getActiveShift = async (
  restaurantId: string
): Promise<{ data: CashShift | null; error: ServiceError | null }> => {
  const { data, error } = await supabase
    .from("cash_shifts")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data as CashShift) ?? null, error: null };
};

export type ShiftMetrics = SalesByMethod & {
  total_tips: number; cash_tips: number; card_tips: number;
  waiter_summary: CashShift["waiter_summary"];
};

/** Aggregate in SQL, including split payments and tips, without PostgREST row truncation. */
export async function getShiftMetrics(shiftId: string): Promise<{ data: ShiftMetrics | null; error: ServiceError | null }> {
  const { data, error } = await supabase.rpc("cash_shift_metrics", { p_shift_id: shiftId });
  if (error || !data) return { data: null, error: toServiceError(error || new Error("Resumen de caja no disponible")) };
  return { data: data as ShiftMetrics, error: null };
}

/**
 * Historial de cierres (turnos cerrados), más recientes primero.
 */
export const getShiftHistory = async (
  restaurantId: string
): Promise<{ data: CashShift[] | null; error: ServiceError | null }> => {
  const { data, error } = await supabase
    .from("cash_shifts")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("opened_at", { ascending: false })
    .limit(50);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data as CashShift[]) ?? [], error: null };
};

/**
 * close_cash_shift: cierra el turno. La RPC calcula server-side los totales
 * por método, el waiter_summary, expected_cash y cash_difference. Idempotente:
 * si ya está cerrado, lo retorna sin recalcular.
 */
export const closeShift = async (
  shiftId: string,
  actualCash: number,
  notes?: string
): Promise<{ data: CashShift | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("close_cash_shift", {
    p_shift_id: shiftId,
    p_actual_cash: actualCash,
    p_notes: notes ?? null,
  });
  if (error) return { data: null, error: toServiceError(error) };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row as CashShift) ?? null, error: null };
};

// === Helpers puros (testeables sin mock) ===================================

/**
 * Efectivo esperado en caja = fondo inicial + ventas en efectivo + propinas
 * en efectivo. Coincide con el cálculo de la RPC close_cash_shift.
 */
export const expectedCash = (
  openingCash: number,
  cashSales: number,
  cashTips: number
): number => {
  const open = Number(openingCash) || 0;
  const sales = Number(cashSales) || 0;
  const tips = Number(cashTips) || 0;
  return open + sales + tips;
};

/**
 * Diferencia de caja = efectivo real contado - esperado.
 * Positivo = sobrante · Negativo = faltante · 0 = cuadrado.
 */
export const cashDifference = (
  actualCash: number,
  expected: number
): number => {
  const actual = Number(actualCash) || 0;
  const exp = Number(expected) || 0;
  return actual - exp;
};

/**
 * Suma ventas por método de pago a partir de pedidos.
 * - Ignora cancelled/rejected y cualquier pedido sin pago confirmado.
 * - payment_method null/vacío/desconocido → bucket cash (igual que el POS
 *   y que la RPC close_cash_shift).
 *
 * Solo es un *preview* en vivo; el cierre autoritativo lo calcula la RPC.
 */
export const sumSalesByMethod = (
  orders: {
    total: number;
    status?: string;
    payment_status?: string | null;
    payment_method?: string | null;
  }[]
): SalesByMethod => {
  const out: SalesByMethod = { cash: 0, card: 0, transfer: 0, qr: 0, total: 0, count: 0 };
  for (const o of orders) {
    if (["cancelled", "rejected"].includes(o.status || "")) continue;
    // Caja representa dinero cobrado, no pedidos enviados/preparados.
    if (o.payment_status !== "paid") continue;
    const total = Number(o.total) || 0;
    out.total += total;
    out.count += 1;
    const method = (o.payment_method || "cash").trim().toLowerCase();
    if (method === "card") out.card += total;
    else if (method === "transfer") out.transfer += total;
    else if (method === "qr") out.qr += total;
    else out.cash += total; // cash, null, vacío o desconocido
  }
  return out;
};

/**
 * Texto legible de la diferencia de caja para el UI.
 * `currency` opcional (multi-país): sin él, formato CLP legacy exacto.
 */
export const formatDifference = (diff: number, currency?: string): string => {
  const d = Number(diff) || 0;
  const formatted = formatCurrency(Math.abs(d), currency || "CLP");
  if (d > 0) return `+${formatted} (sobrante)`;
  if (d < 0) return `-${formatted} (faltante)`;
  return formatCurrency(0, currency || "CLP") + " (cuadrado)";
};
