import { percentageAmount } from "../../shared/money";
import { supabase } from "../config/supabase";
import type { Tip, TipPaymentMethod, TipStatus } from "../config/supabase";
import { toServiceError, type ServiceError } from "./_shared";

// ---------------------------------------------------------------------------
// Propinas — Fase 3
// Patrón: retornar { data, error }.
// ---------------------------------------------------------------------------

export interface TipInput {
  restaurant_id: string;
  order_id?: string;
  waiter_id?: string;
  amount: number;
  percentage?: number;
  payment_method?: TipPaymentMethod;
}

export interface DateRange {
  from: string;
  to: string;
}

export const createTip = async (
  input: TipInput
): Promise<{ data: Tip | null; error: ServiceError | null }> => {
  const { data, error } = await supabase
    .from("tips")
    .insert([input])
    .select()
    .single();
  if (error) return { data: null, error: toServiceError(error) };
  return { data: data as Tip, error: null };
};

export const getTipsByWaiter = async (
  waiterId: string,
  dateRange?: DateRange
) => {
  let query = supabase
    .from("tips")
    .select("*")
    .eq("waiter_id", waiterId);
  if (dateRange) {
    query = query.gte("created_at", dateRange.from).lte("created_at", dateRange.to);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  return { data: (data as Tip[] | null) ?? null, error };
};

export const getTipsByRestaurant = async (
  restaurantId: string,
  dateRange?: DateRange
) => {
  let query = supabase
    .from("tips")
    .select("*, waiters(name)")
    .eq("restaurant_id", restaurantId);
  if (dateRange) {
    query = query.gte("created_at", dateRange.from).lte("created_at", dateRange.to);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  return {
    data: (data as (Tip & { waiters: { name: string } | null })[] | null) ?? null,
    error,
  };
};

export const markTipsAsPaid = async (
  tipIds: string[]
): Promise<{ error: ServiceError | null }> => {
  const { error } = await supabase
    .from("tips")
    .update({ status: "paid_out" as TipStatus, paid_out_at: new Date().toISOString() })
    .in("id", tipIds);
  if (error) return { error: toServiceError(error) };
  return { error: null };
};

export interface WaiterTipsSummary {
  waiter_id: string;
  waiter_name: string;
  tips_count: number;
  total_tips: number;
}

export const getWaiterTipsSummary = async (
  restaurantId: string,
  dateRange?: DateRange
): Promise<{ data: WaiterTipsSummary[] | null; error: ServiceError | null }> => {
  let query = supabase
    .from("tips")
    .select("waiter_id, amount, waiters(name)")
    .eq("restaurant_id", restaurantId)
    .not("waiter_id", "is", null);
  if (dateRange) {
    query = query.gte("created_at", dateRange.from).lte("created_at", dateRange.to);
  }
  const { data, error } = await query;
  if (error) return { data: null, error: toServiceError(error) };
  if (!data) return { data: [], error: null };

  // Agregar en el cliente (simple, sin RPC extra)
  const map = new Map<string, WaiterTipsSummary>();
  for (const row of data as unknown as { waiter_id: string; amount: number; waiters: { name: string } | null }[]) {
    const id = row.waiter_id;
    const existing = map.get(id);
    if (existing) {
      existing.tips_count += 1;
      existing.total_tips += Number(row.amount);
    } else {
      map.set(id, {
        waiter_id: id,
        waiter_name: row.waiters?.name ?? "—",
        tips_count: 1,
        total_tips: Number(row.amount),
      });
    }
  }
  return { data: Array.from(map.values()), error: null };
};

/**
 * Calcula el monto de propina dado un total y un porcentaje.
 * Útil para el POS antes de insertar el registro.
 */
export const calculateTipAmount = (total: number, percent: number, decimals = 0): number => percentageAmount(total, percent, decimals);
