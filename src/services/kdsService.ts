import { supabase } from "../config/supabase";
import type { Order } from "../config/supabase";
import { toServiceError, type ServiceError } from "./_shared";

// ---------------------------------------------------------------------------
// KDS (Kitchen Display System) — Fase 6
// ---------------------------------------------------------------------------
// Dos vías de acceso:
//   1) KDS interno (/restaurant/kds): el dueño/staff autenticado usa
//      subscribeToOrders sobre orders_events (Realtime). No necesita token.
//   2) KDS público (/kds/:restaurantSlug): pantalla de cocina sin sesión de
//      Supabase. Login con PIN → kitchen_login emite token → polling cada 5s
//      sobre kds_get_orders(token). NO puede usar Realtime (RLS exige auth).
//
// setKitchenPin: el dueño setea/regenera el PIN de cocina desde Settings
// (la RPC hashea el PIN server-side; nunca se persiste en claro).
// ---------------------------------------------------------------------------

export interface KdsRestaurantInfo {
  id: string;
  name: string;
  default_prep_time: number;
  /** Config regional (multi-país; opcional para compat con la RPC previa) */
  country?: string;
  currency?: string;
  default_language?: string;
}

/**
 * Resuelve un restaurante por su slug (lookup público, para el KDS público).
 * No requiere auth: la RLS de `restaurants` permite SELECT de filas activas
 * para que el menú QR público funcione (mismo patrón que CustomerMenu).
 */
export const getRestaurantBySlug = async (
  slug: string
): Promise<{ data: { id: string; name: string } | null; error: ServiceError | null }> => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) return { data: null, error: toServiceError(error) };
  return { data: data as { id: string; name: string } | null, error: null };
};

/**
 * kitchen_login: valida el PIN de cocina y emite un token de sesión opaco.
 * Guarda el token en sessionStorage para sobrevivir recargas de la pantalla KDS.
 */
export const STORAGE_KEY = "cmor_kds_token";
export const kitchenStorageKey = (slug: string) => `${STORAGE_KEY}:${encodeURIComponent(slug)}`;
export function storedKitchenToken(slug: string): string | null {
  try { return sessionStorage.getItem(kitchenStorageKey(slug)); }
  catch { return null; }
}
export function forgetKitchenToken(slug: string): void {
  try { sessionStorage.removeItem(kitchenStorageKey(slug)); }
  catch { /* La capacidad en memoria se descarta igualmente. */ }
}

export const kitchenLogin = async (
  restaurantId: string,
  pin: string,
  slug: string = restaurantId
): Promise<{ data: string | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("kitchen_login", {
    p_restaurant_id: restaurantId,
    p_pin: pin,
  });
  if (error) return { data: null, error: toServiceError(error) };
  const token = typeof data === "string" ? data : null;
  if (token) {
    try {
      sessionStorage.setItem(kitchenStorageKey(slug), token);
    } catch {
      /* sessionStorage puede no estar disponible (SSR) — se ignora */
    }
  }
  return { data: token, error: null };
};

/**
 * kds_get_orders: pedidos activos (pending/accepted/preparing/ready) para el
 * token de cocina. El KDS público hace polling cada 5s.
 */
export const kdsGetOrders = async (
  kitchenToken: string
): Promise<{ data: Order[] | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("kds_get_orders", {
    p_kitchen_token: kitchenToken,
  });
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data as Order[]) ?? [], error: null };
};

/**
 * kds_get_restaurant: datos mínimos del restaurante (nombre, prep time) para
 * la cabecera del KDS público. Valida con el mismo token.
 */
export const kdsGetRestaurant = async (
  kitchenToken: string
): Promise<{ data: KdsRestaurantInfo | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("kds_get_restaurant", {
    p_kitchen_token: kitchenToken,
  });
  if (error) return { data: null, error: toServiceError(error) };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row as KdsRestaurantInfo) ?? null, error: null };
};

/**
 * set_kitchen_pin: el dueño setea/regenera el PIN de cocina. La RPC hashea
 * server-side (pgcrypto). Lanza error si el PIN no cumple longitud mínima.
 */
export const setKitchenPin = async (
  restaurantId: string,
  pin: string
): Promise<{ error: ServiceError | null }> => {
  const { error } = await supabase.rpc("set_kitchen_pin", {
    p_restaurant_id: restaurantId,
    p_pin: pin,
  });
  if (error) return { error: toServiceError(error) };
  return { error: null };
};

// === Helpers puros (testeables sin mock) ===================================

/**
 * Particiona los pedidos activos en las 4 columnas del KDS:
 *   - nuevos: pendientes de aceptar (pending)
 *   - accepted: aceptados, aún no en preparación (accepted)
 *   - preparing: en preparación (preparing)
 *   - ready: listos para entregar (ready)
 */
export interface KdsColumns {
  pending: Order[];
  accepted: Order[];
  preparing: Order[];
  ready: Order[];
}

export const partitionOrders = (orders: Order[]): KdsColumns => {
  const cols: KdsColumns = { pending: [], accepted: [], preparing: [], ready: [] };
  for (const o of orders) {
    if (o.status === "pending") cols.pending.push(o);
    else if (o.status === "accepted") cols.accepted.push(o);
    else if (o.status === "preparing") cols.preparing.push(o);
    else if (o.status === "ready") cols.ready.push(o);
  }
  // Ordenar por created_at ascendente (FIFO: el más antiguo arriba).
  const byOldest = (a: Order, b: Order) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  cols.pending.sort(byOldest);
  cols.accepted.sort(byOldest);
  cols.preparing.sort(byOldest);
  cols.ready.sort(byOldest);
  return cols;
};

/**
 * Minutos transcurridos desde que un pedido fue aceptado (o creado si no hay
 * accepted_at). Negativo = atrasado. Usado para resaltar tickets antiguos.
 */
export const minutesSinceAccepted = (
  order: Pick<Order, "accepted_at" | "created_at">,
  now: Date = new Date()
): number => {
  const start = order.accepted_at
    ? new Date(order.accepted_at).getTime()
    : new Date(order.created_at).getTime();
  return Math.floor((now.getTime() - start) / 60000);
};

/**
 * Cuenta de pedidos activos (pending + accepted + preparing + ready).
 */
export const countActiveOrders = (orders: Order[]): number =>
  orders.filter((o) =>
    ["pending", "accepted", "preparing", "ready"].includes(o.status)
  ).length;
