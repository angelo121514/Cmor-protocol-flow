import {operationKey,completeOperation} from "./idempotent-operation";
import { percentageAmount, toMinorUnits, fromMinorUnits } from "../../shared/money";
import { supabase } from "../config/supabase";
import type { RestaurantTable, TableSession } from "../config/supabase";
import { SUPABASE_URL } from "../config/config";
import { toServiceError, type ServiceError } from "./_shared";

// ---------------------------------------------------------------------------
// Mesas y Pago QR — Fase 5
// ---------------------------------------------------------------------------
// Dos grupos de funciones:
//   1) CRUD de mesas para el OWNER (RLS lo permite; gating pro/enterprise en el nav).
//   2) Acceso del CLIENTE vía token (RPC públicas SECURITY DEFINER): nunca se
//      hace SELECT directo a restaurant_tables/table_sessions desde el cliente
//      anónimo — todo pasa por RPC que devuelve solo la fila validada por token.
// ---------------------------------------------------------------------------

// === Tipos de retorno de las RPC ===========================================

export interface TableByToken {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  status: string;
  /** Config regional del restaurante (multi-país). Opcionales: la RPC
   *  ampliada los devuelve desde 20260831000001. */
  restaurant_currency?: string;
  restaurant_country?: string;
  restaurant_language?: string;
}

export interface StartedSession {
  session_token: string;
  session_id: string;
  table_number: string;
  restaurant_id: string;
}

export interface SessionStatus {
  session_id: string;
  restaurant_id: string;
  table_id: string;
  table_number: string;
  status: string;
  started_at: string;
  total_amount: number;
  tip_amount: number;
}

export interface TableOrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  item_total: number;
  selected_size_id?: string | null;
  selected_addon_ids?: string[];
}

export interface TableOrderSummary {
  id: string;
  order_number: string;
  status: string;
  items: TableOrderItem[];
  total: number;
  created_at: string;
}

export interface CreateTableOrderResult {
  success: boolean;
  receipt_token?: string;
  error?: string;
  order_id?: string;
  order_number?: string;
  access_token?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  session_total?: number;
  menu_item_id?: string;
}

export interface OrderPayResponse {
  success: boolean;
  receipt_token?: string;
  error?: string;
  message?: string;
  /** "flow" (Chile) o "mp" (Mercado Pago BR/PE, Fase 2) */
  provider?: "flow" | "mp";
  url?: string;
  token?: string;
  flowOrder?: number;
  payment_id?: string;
  status?: string;
  pix_qr_code?: string | null;
  pix_qr_base64?: string | null;
  amount?: number;
  orders_total?: number;
  tip_amount?: number;
}

// === CRUD de mesas (owner) =================================================

export const getTables = async (
  restaurantId: string
): Promise<{ data: RestaurantTable[] | null; error: ServiceError | null }> => {
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("table_number", { ascending: true });
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data as RestaurantTable[]) ?? [], error: null };
};

export interface TableInput {
  restaurant_id: string;
  table_number: string;
  capacity?: number;
  status?: "available" | "occupied" | "reserved" | "cleaning";
  is_active?: boolean;
}

export const createTable = async (
  input: TableInput
): Promise<{ data: RestaurantTable | null; error: ServiceError | null }> => {
  const { data, error } = await supabase
    .from("restaurant_tables")
    .insert([input])
    .select()
    .single();
  if (error) return { data: null, error: toServiceError(error) };
  return { data: data as RestaurantTable, error: null };
};

export const updateTable = async (
  tableId: string,
  patch: Partial<TableInput>
): Promise<{ error: ServiceError | null }> => {
  const { error } = await supabase
    .from("restaurant_tables")
    .update(patch)
    .eq("id", tableId);
  if (error) return { error: toServiceError(error) };
  return { error: null };
};

export const deleteTable = async (
  tableId: string
): Promise<{ error: ServiceError | null }> => {
  const { error } = await supabase
    .from("restaurant_tables")
    .delete()
    .eq("id", tableId);
  if (error) return { error: toServiceError(error) };
  return { error: null };
};

/** Regenera el qr_token de una mesa (p. ej. si se comprometió el sticker). */
export const regenerateQrToken = async (
  tableId: string
): Promise<{ data: RestaurantTable | null; error: ServiceError | null }> => {
  // PostgreSQL only applies a column DEFAULT on INSERT (or explicit DEFAULT),
  // not when an UPDATE sends null. Generate the opaque replacement token here.
  const qrToken = crypto.randomUUID();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .update({ qr_token: qrToken })
    .eq("id", tableId)
    .select()
    .single();
  if (error) return { data: null, error: toServiceError(error) };
  return { data: data as RestaurantTable, error: null };
};

/** Sesiones activas/cerradas recientes de un restaurante (para el dashboard de mesas). */
export const getTableSessions = async (
  restaurantId: string
): Promise<{ data: TableSession[] | null; error: ServiceError | null }> => {
  const { data, error } = await supabase
    .from("table_sessions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data as TableSession[]) ?? [], error: null };
};

// === Acceso del cliente (RPC públicas) =====================================

export const getTableByToken = async (
  qrToken: string
): Promise<{ data: TableByToken | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("get_table_by_token", {
    p_qr_token: qrToken,
  });
  if (error) return { data: null, error: toServiceError(error) };
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return { data: null, error: null };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    data: {
      id: row.id,
      restaurant_id: row.restaurant_id,
      table_number: row.table_number,
      capacity: row.capacity,
      status: row.status,
      restaurant_currency: row.restaurant_currency ?? undefined,
      restaurant_country: row.restaurant_country ?? undefined,
      restaurant_language: row.restaurant_language ?? undefined,
    },
    error: null,
  };
};

export const startSession = async (
  qrToken: string
): Promise<{ data: StartedSession | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("start_table_session_by_qr", {
    p_qr_token: qrToken,
  });
  if (error) return { data: null, error: toServiceError(error) };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { data: null, error: null };
  return { data: row as StartedSession, error: null };
};

export const getSessionByToken = async (
  sessionToken: string
): Promise<{ data: SessionStatus | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("get_session_by_token", {
    p_session_token: sessionToken,
  });
  if (error) return { data: null, error: toServiceError(error) };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { data: null, error: null };
  return { data: row as SessionStatus, error: null };
};

export const getTableOrders = async (
  sessionToken: string
): Promise<{ data: TableOrderSummary[] | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("get_table_orders", {
    p_session_token: sessionToken,
  });
  if (error) return { data: null, error: toServiceError(error) };
  return { data: (data as TableOrderSummary[]) ?? [], error: null };
};

export interface CreateTableOrderInput {
  session_token: string;
  items: {
    menu_item_id: string;
    quantity: number;
    selected_size_id?: string | null;
    selected_addon_ids?: string[];
  }[];
  customer_name?: string;
  customer_phone?: string;
  customer_notes?: string;
}

export const createTableOrder = async (
  input: CreateTableOrderInput
): Promise<{ data: CreateTableOrderResult | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("create_table_order", {
    p_session_token: input.session_token,
    p_order_data: {...input,operation_key:await operationKey(`table-order:${input.session_token}`,input)},
  });
  if (error) return { data: null, error: toServiceError(error) };
  const result = (Array.isArray(data) ? data[0] : data) as CreateTableOrderResult;
  if(result?.success)completeOperation(`table-order:${input.session_token}`);
  return { data: result, error: null };
};

// === Pago (Edge Function order-pay) ========================================

const ORDER_PAY_URL = `${SUPABASE_URL}/functions/v1/order-pay`;

export interface RequestPaymentInput {
  session_token: string;
  tip_amount?: number;
  origin?: string;
}

export const requestPayment = async (
  input: RequestPaymentInput
): Promise<{ data: OrderPayResponse | null; error: ServiceError | null }> => {
  try {
    const res = await fetch(ORDER_PAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_token: input.session_token,
        tip_amount: input.tip_amount ?? 0,
        origin: input.origin ?? window.location.origin,
      }),
    });
    const json = (await res.json()) as OrderPayResponse;
    if (!res.ok || !json.success) {
      return {
        data: json.receipt_token ? json : null,
        error: { message: json.error || `order-pay HTTP ${res.status}` },
      };
    }
    return { data: json, error: null };
  } catch (err) {
    return { data: null, error: toServiceError(err) };
  }
};

// === Helpers puros (testeables sin mock) ===================================

/**
 * Calcula el monto de propina a partir de un porcentaje sobre el subtotal.
 * Devuelve un entero en CLP (redondeo hacia arriba).
 */
/**
 * Calcula la propina por porcentaje redondeando en la frontera monetaria.
 * `decimals` 0 = entero CLP (legacy, Math.ceil); 2 = centavos (BRL/BOB/PEN).
 */
export const calcTipFromPercent = (total: number, percent: number, decimals = 0): number => percentageAmount(total, percent, decimals);

/**
 * Suma los totales de los pedidos no cancelados de una sesión.
 */
export const sumSessionTotal = (orders: {total:number;status?:string;payment_status?:string}[],decimals=0):number =>
 fromMinorUnits(orders.filter(o=>!["cancelled","rejected"].includes(o.status||"")&&o.payment_status!=="paid")
 .reduce((sum,o)=>{const total=Number(o.total);if(total<0)throw new RangeError("invalid_money");return sum+toMinorUnits(total,decimals);},0),decimals);
export const calcPaymentAmount = (orders:{total:number;status?:string;payment_status?:string}[],tip:number,decimals=0):number =>
 fromMinorUnits(toMinorUnits(sumSessionTotal(orders,decimals),decimals)+toMinorUnits(Math.max(0,tip),decimals),decimals);

/**
 * Construye la URL del menú público de la mesa a partir del qr_token.
 */
export const buildTableQrUrl = (qrToken: string): string => {
  const base = window.location.origin;
  return `${base}/mesa/${qrToken}`;
};

export async function getCheckoutReceipt(token: string) {
 const {data,error}=await supabase.rpc("checkout_receipt",{p_token:token});
 return {data:data as {state:string;amount:number;currency:string;tip_amount:number}|null,error};
}
