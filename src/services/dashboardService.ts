import { formatCurrency } from "../utils/helpers";
import { supabase } from "../config/supabase";
import type { Notification } from "../config/supabase";
import { toServiceError, type ServiceError } from "./_shared";

// -------------------------------------------------------------------
// Dashboard del Dueño — Fase 8
// -------------------------------------------------------------------

/** Estadísticas extendidas para el dashboard del dueño. */
export interface DashboardStats {
  // Stats básicas (ya existentes en getRestaurantStats)
  pendingOrders: number;
  completedToday: number;
  revenueToday: number;
  totalOrders: number;
  // Nuevas métricas
  activeWaiters: number;
  occupiedTables: number;
  totalTables: number;
  lowStockCount: number;
  tipsToday: number;
  shiftOpen: boolean;
  unreadNotifications: number;
}

/**
 * Obtiene notificaciones no leídas del restaurante.
 * RLS se encarga de filtrar por owner.
 */
export const getUnreadNotifications = async (
  restaurantId: string
): Promise<{ data: Notification[]; error: ServiceError | null }> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(20);

  return { data: (data as Notification[]) ?? [], error: error ? toServiceError(error) : null };
};

/**
 * Marca todas las notificaciones del restaurante como leídas.
 */
export const markAllNotificationsRead = async (
  restaurantId: string
): Promise<{ error: ServiceError | null }> => {
  const { error } = await supabase.rpc("mark_notifications_read", {
    p_restaurant_id: restaurantId,
  });
  return { error: error ? toServiceError(error) : null };
};

/**
 * Obtiene métricas expandidas para el dashboard del dueño.
 * Combina getRestaurantStats + queries de meseros, mesas, inventario, caja.
 */
export const getDashboardStats = async (
  restaurantId: string
): Promise<{ data: DashboardStats | null; error: ServiceError | null }> => {
  const start=new Date();start.setHours(0,0,0,0);
  const {data,error}=await supabase.rpc("restaurant_dashboard",{p_restaurant_id:restaurantId,p_start:start.toISOString()});
  return {data:error?null:data as DashboardStats,error:error?toServiceError(error):null};
};

// -------------------------------------------------------------------
// Helpers puros testeables (sin dependencia de Supabase)
// -------------------------------------------------------------------

/**
 * Deriva el ícono de notificación según el tipo.
 */
export const notificationIcon = (type: string): string => {
  const map: Record<string, string> = {
    low_stock: "Package",
    order_new: "ShoppingBag",
    order_completed: "CheckCircle",
    order_cancelled: "XCircle",
    shift_opened: "Wallet",
    shift_closed: "Wallet",
    info: "Info",
  };
  return map[type] || "Info";
};

/**
 * Formatea tiempo relativo (hace X min/horas/días).
 */
export const timeAgo = (dateStr: string): string => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `hace ${diffDays}d`;
};

/**
 * Calcula porcentaje de ocupación de mesas.
 */
export const tableOccupancy = (occupied: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((occupied / total) * 100);
};

/**
 * Formatea un número de propinas como moneda.
 * `currency` opcional (multi-país): sin él, formato CLP legacy exacto.
 */
export const formatTips = (tips: number, currency?: string): string => {
  return formatCurrency(tips, currency || "CLP");
};
