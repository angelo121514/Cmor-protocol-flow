import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Database types
export interface RegistrationRequest {
  id: string;
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email?: string;
  city: string;
  address?: string;
  restaurant_type: string;
  heard_from?: string;
  notes?: string;
  status: "pending" | "contacted" | "verified" | "rejected";
  /** País del restaurante (multi-país; CL default) */
  country?: "CL" | "BR" | "BO" | "PE";
  contacted_at?: string;
  rejection_reason?: string;
  internal_notes?: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  registration_request_id?: string;
  name: string;
  slug: string;
  owner_name?: string;
  phone: string;
  email: string;
  city?: string;
  address?: string;
  restaurant_type?: string;
  logo_url?: string;
  qr_code_url?: string;
  subscription_plan: "free_trial" | "starter" | "pro" | "enterprise" | "lifetime";
  status: "active" | "blocked" | "trial";
  is_active: boolean;
  internal_notes?: string;
  block_reason?: string;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
  currency?: "CLP" | "USD" | "BRL" | "BOB" | "PEN";
  usd_exchange_rate?: number;
  default_language?: "es" | "en" | "pt";
  default_prep_time?: number;
  /** País del restaurante (multi-país Fase 1: CL/BR/BO/PE) */
  country?: "CL" | "BR" | "BO" | "PE";
  /** Tasa de impuesto efectiva (fracción). 0 = no desglosar impuesto. */
  tax_rate?: number;
  pin_required?: boolean;
  tips_enabled?: boolean;
  tips_default_pct?: number;
  tips_suggested_pcts?: number[];
  kitchen_pin_hash?: string;
  kitchen_token?: string;
}

export interface User {
  id: string;
  restaurant_id?: string;
  email: string;
  password_hash: string;
  temp_password: boolean;
  role: "owner" | "staff";
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  /** Traducción al portugués (Fase 2 multi-país; opcional) */
  name_pt?: string;
  description_pt?: string;
  base_price: number;
  category?: string;
  image_url?: string;
  is_available: boolean;
  sizes?: { name: string; price: number }[];
  addons?: { name: string; price: number }[];
  created_at: string;
  image_urls?: string[];
}

export interface Customer {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  currency?: "CLP" | "USD" | "BRL" | "BOB" | "PEN" | null; // NULL en órdenes históricas sin evidencia de moneda.
  customer_id?: string;
  order_number: string;
  order_type: "qr" | "counter" | "phone" | "table";
  table_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  status:
    | "pending"
    | "accepted"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled"
    | "rejected";
  payment_method?: string;
  // CHECK en BD (orders): ('pending','paid','failed')
  payment_status?: "paid" | "pending" | "failed";
  payment_transaction_id?: string;
  customer_notes?: string;
  internal_notes?: string;
  waiter_id?: string;
  waiter_name?: string;
  is_split?: boolean;
  split_count?: number;
  tip_amount?: number; // Response projection, persisted in tips.
  cash_shift_id?: string;
  table_session_id?: string;
  accepted_at?: string;
  preparing_at?: string;
  ready_at?: string;
  paid_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  description?: string;
  quantity: number;
  base_price: number;
  unit_price?: number;
  selected_size?: { name: string; price: number };
  selected_addons?: { name: string; price: number }[];
  item_total: number;
  subtotal?: number; // Compatibilidad de recibos históricos.
  special_instructions?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name?: string;
  created_at: string;
}

// --------------------------------------------------------------------
// Inventario y Recetas — Fase 1
// --------------------------------------------------------------------

export type InventoryUnit = "kg" | "g" | "l" | "ml" | "unidad" | "porcion";

export interface InventoryItem {
  id: string;
  restaurant_id: string;
  name: string;
  unit: InventoryUnit;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity_needed: number;
  unit: string;
}

export interface Recipe {
  id: string;
  menu_item_id: string;
  restaurant_id: string;
  ingredients: RecipeIngredient[];
  created_at: string;
  updated_at: string;
}

export type InventoryMovementType =
  | "purchase"
  | "sale_deduction"
  | "manual_adjustment"
  | "waste"
  | "return";

export interface InventoryMovement {
  id: string;
  restaurant_id: string;
  inventory_item_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// --------------------------------------------------------------------
// Meseros y PIN — Fase 2
// --------------------------------------------------------------------

export type WaiterRole = "waiter" | "bartender" | "host" | "cashier";

export interface Waiter {
  id: string;
  restaurant_id: string;
  name: string;
  is_active: boolean;
  photo_url?: string;
  phone?: string;
  email?: string;
  role: WaiterRole;
  created_at: string;
  updated_at: string;
}

export interface WaiterSession {
  id: string;
  waiter_id: string;
  restaurant_id: string;
  started_at: string;
  ended_at?: string;
  tables_served: number;
  orders_count: number;
  total_sales: number;
  total_tips: number;
}

// --------------------------------------------------------------------
// Propinas — Fase 3
// --------------------------------------------------------------------

export type TipPaymentMethod = "cash" | "card" | "transfer" | "qr";
export type TipStatus = "collected" | "pending_payout" | "paid_out";

export interface Tip {
  id: string;
  restaurant_id: string;
  order_id?: string;
  waiter_id?: string;
  amount: number;
  percentage?: number;
  payment_method?: TipPaymentMethod;
  status: TipStatus;
  paid_out_at?: string;
  created_at: string;
}

// --------------------------------------------------------------------
// División de Cuentas — Fase 4
// --------------------------------------------------------------------

export type SplitPaymentMethod = "cash" | "card" | "transfer" | "qr";
export type SplitPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderPayment {
  id: string;
  order_id: string;
  restaurant_id: string;
  payment_number: number;
  amount: number;
  tip_amount: number;
  payment_method: SplitPaymentMethod;
  payment_status: SplitPaymentStatus;
  transaction_id?: string;
  payer_label?: string;
  created_at: string;
}

// --------------------------------------------------------------------
// Mesas y Pago QR — Fase 5
// --------------------------------------------------------------------

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";
export type TableSessionStatus = "active" | "payment_pending" | "closed";

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  qr_token: string;
  capacity: number;
  status: TableStatus;
  is_active: boolean;
  assigned_waiter_id?: string | null;
  assigned_waiter?: { name: string; role: string } | null;
  created_at: string;
  updated_at: string;
}

export interface TableSession {
  id: string;
  table_id: string;
  restaurant_id: string;
  session_token: string;
  status: TableSessionStatus;
  started_at: string;
  closed_at?: string;
  total_amount: number;
  tip_amount: number;
}

// --------------------------------------------------------------------
// Cierre de Turno / Caja — Fase 7
// --------------------------------------------------------------------

export type CashShiftStatus = "open" | "closed";

/** Fila de cash_shifts.waiter_summary (jsonb). */
export interface WaiterShiftSummary {
  waiter_id: string;
  name: string;
  tables: number;
  sales: number;
  tips: number;
}

export interface CashShift {
  id: string;
  restaurant_id: string;
  opened_by?: string;
  closed_by?: string;
  opened_at: string;
  closed_at?: string;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  qr_sales: number;
  total_tips: number;
  cash_tips: number;
  card_tips: number;
  opening_cash: number;
  expected_cash: number;
  actual_cash?: number;
  cash_difference?: number;
  waiter_summary: WaiterShiftSummary[];
  orders_count: number;
  status: CashShiftStatus;
  notes?: string;
  responsible_waiter_id?: string;
  responsible_waiter_name?: string;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------------------------------
// Notificaciones — Fase 8
// --------------------------------------------------------------------

export type NotificationType =
  | "low_stock"
  | "order_new"
  | "order_completed"
  | "order_cancelled"
  | "shift_opened"
  | "shift_closed"
  | "info";

/** Fila de public.notifications (20260710000008_notifications_usage.sql). */
export interface Notification {
  id: string;
  restaurant_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// --------------------------------------------------------------------
// Privacidad (Ley 19.628 / Ley 21.719) — Capa 2
// --------------------------------------------------------------------

export type ConsentScope =
  | "cookies"
  | "marketing"
  | "ai_profiling"
  | "analytics"
  | "third_party_share";

export type ConsentLegalBasis =
  | "consent"
  | "contract"
  | "legal_obligation"
  | "legitimate_interest";

/** Fila de public.consents (Capa 1, 03_privacy_consents.sql). */
export interface Consent {
  id: string;
  subject_id: string | null;
  subject_email: string;
  scope: ConsentScope;
  purpose: string;
  legal_basis: ConsentLegalBasis;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  proof: {
    ip?: string;
    user_agent?: string;
    via?: "cookie_banner" | "first_login_modal" | "dsar" | "account_panel";
    policy_version?: string;
  } | null;
  privacy_policy_version: string;
  created_at: string;
}

export type DsarType =
  | "access"
  | "rectify"
  | "erase"
  | "object"
  | "export"
  | "revoke-consent"
  | "contact";

export type DsarStatus =
  | "pending"
  | "pending_verification"
  | "expired"
  | "failed"
  | "verified"
  | "in_progress"
  | "fulfilled"
  | "rejected"
  | "cancelled";

/** Fila de public.data_subject_requests (Capa 1, 07_data_subject_requests.sql). */
export interface DataSubjectRequest {
  retention_hold?: boolean;
  id: string;
  request_type: DsarType;
  subject_id: string | null;
  subject_email: string;
  verified_at: string | null;
  status: DsarStatus;
  payload: Record<string, unknown> | null;
  fulfilled_at: string | null;
  fulfilled_by: string | null;
  result_metadata: Record<string, unknown> | null;
  rejection_reason: string | null;
  sla_due_at: string;
  created_at: string;
  updated_at: string;
}

/** Versión vigente de la política de privacidad (docs/legal/VERSION.md). */
export const CURRENT_POLICY_VERSION = "2026-06-01";

/** Email de contacto del DPO (placeholder editable). */
export { privacyEmail as DPO_EMAIL } from "./privacyContact";

/**
 * Columnas de `restaurants` legibles desde el cliente (migración
 * 20260828000001). Las columnas sensibles (subscription_plan se lee,
 * pero no se escribe; kitchen_*, flow_*, internal_notes, block_reason)
 * están fuera del grant — usar siempre esta lista en los selects en vez
 * de `select("*")`, que PostgREST rechaza si falta alguna columna.
 */
export const RESTAURANT_COLUMNS = [
  "id",
  "registration_request_id",
  "name",
  "slug",
  "owner_name",
  "phone",
  "email",
  "city",
  "address",
  "restaurant_type",
  "logo_url",
  "qr_code_url",
  "subscription_plan",
  "status",
  "is_active",
  "trial_ends_at",
  "created_at",
  "updated_at",
  "currency",
  "usd_exchange_rate",
  "default_language",
  "default_prep_time",
  "country",
  "tax_rate",
  "pin_required",
  "tips_enabled",
  "tips_default_pct",
  "tips_suggested_pcts",
].join(", ");

// Export real Supabase client (Mock mode is completely disabled)
const activeClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// El modo mock (MockSupabaseClient) está desactivado y ya no se importa
// aquí: salía en el bundle de producción sin usarse. Los tests que lo
// necesitan lo importan directamente desde "./mockSupabase".
export const supabase = activeClient;
