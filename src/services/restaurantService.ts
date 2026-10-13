import { operationKey, completeOperation } from "./idempotent-operation";
import { supabase } from "../config/supabase";
import type { Order, MenuItem, Customer } from "../config/supabase";
import "../utils/helpers";
import "../utils/logger";
import { readAllPages } from "./pagination";


/**
 * Restaurant API Service
 * All restaurant dashboard operations with real-time support
 *
 * ⚠️  WORKAROUND REALTIME (2026-06-29):
 * La tabla `orders` está particionada y Supabase Realtime NO emite eventos
 * postgres_changes para tablas particionadas (bug conocido).
 * Por eso subscribeToOrders escucha la tabla `orders_events` (NO particionada)
 * que recibe un INSERT por cada cambio en orders vía trigger.
 * Cada evento trae event_type ('INSERT'|'UPDATE'|'DELETE') y order_data.
 */

// Interfaz del evento espejo (tabla orders_events)
interface OrderEvent {
  id: string;            // id del evento (no del pedido)
  order_id: string;      // id del pedido
  restaurant_id: string;
  event_type: "INSERT" | "UPDATE" | "DELETE";
  order_data: Order | null;  // snapshot del pedido (null si DELETE)
  created_at: string;
}

// Subscribe to restaurant's orders with real-time updates
// Escucha la tabla espejo `orders_events` para eludir el bug de tablas particionadas.
// Fallback: refetch cada 30s por si se pierde algún evento.
export const subscribeToOrders = (
  restaurantId: string,
  callback: (orders: Order[]) => void
) => {
  let currentOrders: Order[] = [];

  const fetchOrders = async () => {
    // Limitar a los últimos 7 días para no cargar todo el historial
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      currentOrders = data;
      callback(currentOrders);
    }
  };

  // Carga inicial
  fetchOrders();

  // Fallback: refetch cada 30s (por si se pierden eventos)
  const fallbackInterval = setInterval(fetchOrders, 30_000);

  // Suscripción a orders_events (tabla espejo NO particionada)
  // Cada INSERT en orders_events representa un INSERT/UPDATE/DELETE en orders.
  const subscription = supabase
    .channel(`restaurant-orders-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "orders_events",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload) => {
        const evt = payload.new as OrderEvent;
        if (!evt) return;

        const eventType = evt.event_type;
        const orderId = evt.order_id;
        const orderData = evt.order_data;

        if (eventType === "INSERT" && orderData) {
          // Evitar duplicados (por si el evento llega antes que la carga inicial)
          if (!currentOrders.find((o) => o.id === orderId)) {
            currentOrders = [orderData, ...currentOrders];
            callback(currentOrders);
          }
        } else if (eventType === "UPDATE" && orderData) {
          const exists = currentOrders.find((o) => o.id === orderId);
          if (exists) {
            // Actualizar el pedido existente
            currentOrders = currentOrders.map((o) =>
              o.id === orderId ? { ...o, ...orderData } : o
            );
          } else {
            // Pedido nuevo que no estaba en la carga inicial (ej: >7 días)
            currentOrders = [orderData, ...currentOrders];
          }
          callback(currentOrders);
        } else if (eventType === "DELETE") {
          currentOrders = currentOrders.filter((o) => o.id !== orderId);
          callback(currentOrders);
        }
        // Otros eventos: ignorar (el fallback de 30s lo captura)
      }
    )
    .subscribe();

  // Retornar objeto con método unsubscribe que limpia interval
  return {
    ...subscription,
    unsubscribe: () => {
      clearInterval(fallbackInterval);
      void supabase.removeChannel(subscription);
    },
  };
};

// Update order status
// Fase 6: estampa el timestamp _at correspondiente a cada transición de cocina
// (accepted_at, preparing_at, ready_at, completed_at, cancelled_at). El timer
// de Orders.tsx y el KDS leen estos campos para calcular el tiempo de prep.
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  paymentData?: {
    paymentMethod?: string;
    transactionId?: string;
  }
) => {
  const nowIso = new Date().toISOString();
  const updateData: Record<string, unknown> = { status, updated_at: nowIso };

  // Estampar el timestamp del nuevo estado (si la columna existe en Order).
  const timestampField = `${status}_at`;
  if (
    ["accepted", "preparing", "ready", "completed", "cancelled"].includes(status)
  ) {
    updateData[timestampField] = nowIso;
  }

  if (paymentData) {
    updateData.payment_method = paymentData.paymentMethod;
    updateData.payment_transaction_id = paymentData.transactionId;
    updateData.payment_status = "paid";
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  return !error;
};

// Subscribe to menu items with real-time updates
// Optimizado: muta estado local según evento (no refetch completo).
export const subscribeToMenuItems = (
  restaurantId: string,
  callback: (items: MenuItem[]) => void
) => {
  let currentItems: MenuItem[] = [];

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      currentItems = data;
      callback(currentItems);
    }
  };

  fetchItems();

  const subscription = supabase
    .channel(`restaurant-menu-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "menu_items",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as MenuItem;
        const oldRow = payload.old as MenuItem;

        if (eventType === "INSERT" && newRow) {
          // Evitar duplicados
          if (!currentItems.find((i) => i.id === newRow.id)) {
            currentItems = [newRow, ...currentItems];
            callback(currentItems);
          }
        } else if (eventType === "UPDATE" && newRow) {
          currentItems = currentItems.map((i) =>
            i.id === newRow.id ? { ...i, ...newRow } : i
          );
          callback(currentItems);
        } else if (eventType === "DELETE" && oldRow) {
          currentItems = currentItems.filter((i) => i.id !== oldRow.id);
          callback(currentItems);
        }
      }
    )
    .subscribe();

  return subscription;
};

// Create menu item
export const createMenuItem = async (item: Partial<MenuItem>) => {
  const { data, error } = await supabase
    .from("menu_items")
    .insert([item])
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("Error creating menu item:", error);
    return { success: false, error: error?.message || "No se confirmó el plato guardado." };
  }
  return { success: true, id: String(data.id) };
};

// Update menu item
export const updateMenuItem = async (
  itemId: string,
  updates: Partial<MenuItem>
) => {
  const { error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", itemId);

  if (error) {
    console.error("Error updating menu item:", error);
    return { success: false, error: error.message };
  }
  return { success: true, id: itemId };
};

// Toggle menu item availability (triggers real-time update for customers)
export const toggleMenuItemAvailability = async (
  itemId: string,
  isAvailable: boolean
) => {
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId);

  return !error;
};

// Delete menu item
export const deleteMenuItem = async (itemId: string) => {
  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);

  return !error;
};

// Create order (manual or from customer)
// P0-1: retorna access_token para que el cliente pueda ver su pedido
// vía get_my_order(token) sin necesidad de política RLS pública.
// P1-1: si feature flag use_rpc_create_order está activo, usa RPC que
// recalcula totales server-side (evita manipulación de precios).
export const createOrder = async (order: Partial<Order>) => {
  const scope=`public-order:${order.restaurant_id}`;
  const { data, error } = await createOrderViaRpc(order,await operationKey(scope,order));
  if(!error&&data?.success)completeOperation(scope);
  return { data, error: error || (data?.success === false ? { message: data.error || "order_failed" } : null) };
};
export const writePosOrder = async (order: Partial<Order> & { tip_amount?: number; split_parts?: unknown[] }, key: string, orderId?: string | null) => {
  const { data, error } = await supabase.rpc("write_pos_order", {
    p_restaurant_id: order.restaurant_id, p_order: order, p_key: key, p_order_id: orderId ?? null,
  });
  return { data: data as Order | null, error };
};

export const createOrUpdateCustomerForOrder = async (order: Partial<Order>) => {
  const restaurantId = order.restaurant_id;
  const name = order.customer_name?.trim();
  const phone = order.customer_phone?.trim();
  const email = order.customer_email?.trim();

  if (!restaurantId || !name || !phone) return null;

  const { data: existing, error: findError } = await supabase
    .from("restaurant_customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("phone", phone)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.warn("No se pudo buscar el cliente del CRM en modo legacy:", findError.message);
    return null;
  }

  const now = new Date().toISOString();
  const query = existing
    ? supabase
        .from("restaurant_customers")
        .update({ name, email: email || existing.email || null, updated_at: now })
        .eq("id", existing.id)
    : supabase
        .from("restaurant_customers")
        .insert([{ restaurant_id: restaurantId, name, phone, email: email || null, updated_at: now }]);

  const { data, error } = await query
    .select()
    .single();

  if (error) {
    console.warn("No se pudo vincular el pedido al CRM en modo legacy:", error.message);
    return null;
  }

  return data as Customer;
};

// P1-1: crear pedido vía RPC server-side (totales recalculados)
async function createOrderViaRpc(order: Partial<Order>, key:string) {
  const { data, error } = await supabase.rpc("create_order", {
    p_restaurant_id: order.restaurant_id!,
    p_items: order.items,
    p_key:key,
    p_customer_name: order.customer_name || null,
    p_customer_phone: order.customer_phone || null,
    p_customer_email: order.customer_email || null,
    p_order_type: order.order_type || "qr",
    p_table_number: order.table_number || null,
    p_notes: order.customer_notes || null,
    p_payment_method: order.payment_method || "qr",
  });
  return { data, error };
}

// P0-1: obtener pedido por access_token (one-shot, 24h TTL)
// Reemplaza la política RLS pública USING(true) eliminada.
export const getMyOrder = async (accessToken: string) => {
  const { data, error } = await supabase.rpc("get_my_order", {
    p_token: accessToken,
  });
  return { data, error };
};

// Update order (manual or from customer)
export const updateOrder = async (orderId: string, updates: Partial<Order>) => {
  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .select()
    .single();

  return { data, error };
};

// Get restaurant stats
export const getRestaurantStats = async (restaurantId: string) => {
  const start=new Date();start.setHours(0,0,0,0);
  const {data,error}=await supabase.rpc("restaurant_dashboard",{p_restaurant_id:restaurantId,p_start:start.toISOString()});
  if(error || !data) throw new Error("No se pudieron consultar las ventas.");
  return data as {pendingOrders:number;completedToday:number;revenueToday:number;totalOrders:number};
};

// --- Customer & CRM Service Functions ---

export type CustomerOrder = Pick<Order, "id" | "restaurant_id" | "customer_phone" | "customer_name" | "customer_email" | "total" | "status" | "payment_status" | "items" | "completed_at" | "created_at" | "updated_at" | "order_number" | "payment_method">;
export interface CustomerWithOrders extends Customer { orders: CustomerOrder[]; isSynthetic: boolean; }

// Get all customers for a restaurant
export const getCustomers = async (restaurantId: string) => {
  // El histórico completo de órdenes crece sin límite y se transfiera
  // entero al navegador en cada montaje del POS: se acota a los últimos
  // 90 días y a las columnas que la agregación realmente usa.
  const ninetyDaysAgo = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [data,orderData]=await Promise.all([
    readAllPages<Customer>((from,to)=>supabase.from("restaurant_customers").select("*").eq("restaurant_id",restaurantId).order("id").range(from,to)),
    readAllPages<CustomerOrder>((from,to)=>supabase.from("orders").select("id,restaurant_id,customer_phone,customer_name,customer_email,total,status,payment_status,items,completed_at,order_number,payment_method,created_at,updated_at").eq("restaurant_id",restaurantId).not("customer_phone","is",null).gte("created_at",ninetyDaysAgo).order("id").range(from,to))
  ]);

  const customersByPhone = new Map<string, CustomerWithOrders>();
  (data || []).forEach((customer) => {
    customersByPhone.set(customer.phone, {
      ...customer,
      orders: [],
      isSynthetic: false,
    });
  });

  (orderData || []).forEach((order) => {
    const phone = order.customer_phone;
    if (!phone) return;

    const existing = customersByPhone.get(phone);
    if (existing) {
      const hasOrder = existing.orders.some((o) => o.id === order.id);
      if (!hasOrder) existing.orders.push(order);
      if (order.customer_name && existing.name !== order.customer_name) {
        existing.name = order.customer_name;
      }
      return;
    }

    customersByPhone.set(phone, {
      id: `order:${restaurantId}:${phone}`,
      restaurant_id: restaurantId,
      name: order.customer_name || "Cliente QR",
      phone,
      email: order.customer_email || undefined,
      notes: undefined,
      created_at: order.created_at,
      updated_at: order.updated_at || order.created_at,
      orders: [order],
      isSynthetic: true,
    });
  });

  return Array.from(customersByPhone.values());
};

// Create a new customer
export const createCustomer = async (customer: Partial<Customer>) => {
  const { data, error } = await supabase
    .from("restaurant_customers")
    .insert([customer])
    .select()
    .single();

  return { data: data as Customer | null, error };
};

// Update customer details (e.g. notes)
export const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
  const { data, error } = await supabase
    .from("restaurant_customers")
    .update(updates)
    .eq("id", customerId)
    .select()
    .single();

  return { data: data as Customer | null, error };
};

// Get last 3 orders for a customer
export const getCustomerOrders = async (customerId: string, limit = 3) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching customer orders:", error);
    return [];
  }
  return data as Order[];
};

// =====================================================
// P1-9: Reports usando RPCs SQL (en vez de SELECT * + JS)
// =====================================================

export const getDailySales = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_daily_sales", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};

export const getTopItems = async (restaurantId: string, fromDate: string, toDate?: string, limit = 20) => {
  const { data, error } = await supabase.rpc("get_top_items", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
    p_limit: limit,
  });
  return { data, error };
};

export const getAvgTicket = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_avg_ticket", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};

export const getSalesByHour = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_sales_by_hour", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};

export const getSalesByOrderType = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_sales_by_order_type", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};

export const getReportsSummary = async (restaurantId: string, fromDate: string, toDate?: string) => {
  const { data, error } = await supabase.rpc("get_reports_summary", {
    p_restaurant_id: restaurantId,
    p_from: fromDate,
    p_to: toDate,
  });
  return { data, error };
};

// Implement branch creation features for Pro restaurants
export const createRestaurantBranch = async (
  profileId: string,
  activeRestaurant: {
    subscription_plan: "free_trial" | "starter" | "pro" | "enterprise" | "lifetime";
    status: "active" | "blocked" | "trial";
    is_active: boolean;
  },
  branchDetails: {
    name: string;
    email: string;
    phone: string;
    city?: string;
    address?: string;
    restaurant_type?: string;
  }
) => {
  const { data, error } = await supabase.rpc("create_restaurant_branch", {
    p_name: branchDetails.name,
    p_email: branchDetails.email,
    p_phone: branchDetails.phone,
    p_city: branchDetails.city || null,
    p_address: branchDetails.address || null,
    p_restaurant_type: branchDetails.restaurant_type || null,
    p_subscription_plan: activeRestaurant.subscription_plan,
    p_status: activeRestaurant.status,
    p_is_active: activeRestaurant.is_active,
  });

  return {
    data: data ? { id: data } : null,
    error,
  };
};

