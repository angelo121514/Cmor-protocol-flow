import { supabase } from "../config/supabase";
import type { Waiter, WaiterSession, WaiterRole } from "../config/supabase";
import { toServiceError, type ServiceError } from "./_shared";

// ---------------------------------------------------------------------------
// Meseros — Fase 2
// Patrón: retornar { data, error }. Las escrituras sensibles (create/update/
// validate) usan RPC SECURITY DEFINER que valida ownership y hashea el PIN
// server-side. El frontend NUNCA ve ni envía pin_hash.
// ---------------------------------------------------------------------------

export interface WaiterInput {
  restaurant_id: string;
  name: string;
  pin: string;
  role?: WaiterRole;
}

export interface ActiveWaiter {
  waiter_id: string;
  waiter_name: string;
  waiter_role: WaiterRole;
  session_id: string;
}

// --- Lecturas --------------------------------------------------------------

export const getWaiters = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("waiters")
    .select("id, restaurant_id, name, is_active, photo_url, phone, email, role, created_at, updated_at")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });
  return { data: (data as Waiter[] | null) ?? null, error };
};

export const getActiveSessions = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("waiter_sessions")
    .select(
      "id, waiter_id, restaurant_id, started_at, ended_at, tables_served, orders_count, total_sales, total_tips, waiters(name, role)"
    )
    .eq("restaurant_id", restaurantId)
    .is("ended_at", null)
    .order("started_at", { ascending: false });
  return { data: data as unknown as (WaiterSession & { waiters: { name: string; role: WaiterRole } | null })[] | null, error };
};

export const getSessionHistory = async (restaurantId: string, limit = 50) => {
  const { data, error } = await supabase
    .from("waiter_sessions")
    .select(
      "id, waiter_id, restaurant_id, started_at, ended_at, tables_served, orders_count, total_sales, total_tips, waiters(name, role)"
    )
    .eq("restaurant_id", restaurantId)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(limit);
  return { data: data as unknown as (WaiterSession & { waiters: { name: string; role: WaiterRole } | null })[] | null, error };
};

// --- Escrituras vía RPC ----------------------------------------------------

export const createWaiter = async (
  input: WaiterInput
): Promise<{ data: string | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("create_waiter", {
    p_restaurant_id: input.restaurant_id,
    p_name: input.name,
    p_pin: input.pin,
    p_role: input.role ?? "waiter",
  });
  if (error) return { data: null, error: toServiceError(error) };
  return { data: data as string, error: null };
};

export const updateWaiter = async (
  waiterId: string,
  updates: { name?: string; pin?: string; role?: WaiterRole; is_active?: boolean }
): Promise<{ error: ServiceError | null }> => {
  const { error } = await supabase.rpc("update_waiter", {
    p_waiter_id: waiterId,
    p_name: updates.name ?? null,
    p_pin: updates.pin ?? null,
    p_role: updates.role ?? null,
    p_is_active: updates.is_active ?? null,
  });
  if (error) return { error: toServiceError(error) };
  return { error: null };
};

export const deactivateWaiter = async (waiterId: string) => {
  return updateWaiter(waiterId, { is_active: false });
};

export const validatePin = async (
  restaurantId: string,
  pin: string
): Promise<{ data: ActiveWaiter | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("validate_waiter_pin", {
    p_restaurant_id: restaurantId,
    p_pin: pin,
  });
  if (error) return { data: null, error: toServiceError(error) };
  // Si el PIN es incorrecto, la RPC retorna 0 filas (data es array vacío)
  if (!data || (data as unknown[]).length === 0) {
    return { data: null, error: null };
  }
  const row = (data as unknown[])[0] as ActiveWaiter;
  return { data: row, error: null };
};

export const endSession = async (
  sessionId: string
): Promise<{ error: ServiceError | null }> => {
  const { error } = await supabase.rpc("end_waiter_session", {
    p_session_id: sessionId,
  });
  if (error) return { error: toServiceError(error) };
  return { error: null };
};
