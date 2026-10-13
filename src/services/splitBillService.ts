import { distributeMoney, toMinorUnits, fromMinorUnits } from "../../shared/money";
import { supabase } from "../config/supabase";
import type {
  OrderPayment,
  SplitPaymentMethod,
  SplitPaymentStatus,
} from "../config/supabase";
import { toServiceError, type ServiceError } from "./_shared";

// ---------------------------------------------------------------------------
// División de Cuentas — Fase 4
// ---------------------------------------------------------------------------

export interface OrderPaymentInput {
  order_id: string;
  restaurant_id: string;
  payment_number?: number;
  amount: number;
  tip_amount?: number;
  payment_method: SplitPaymentMethod;
  payment_status?: SplitPaymentStatus;
  payer_label?: string;
}

export const getOrderPayments = async (orderId: string) => {
  const { data, error } = await supabase
    .from("order_payments")
    .select("*")
    .eq("order_id", orderId)
    .order("payment_number", { ascending: true });
  return { data: (data as OrderPayment[] | null) ?? null, error };
};

export const createOrderPayment = async (
  input: OrderPaymentInput
): Promise<{ data: OrderPayment | null; error: ServiceError | null }> => {
  const { data, error } = await supabase
    .from("order_payments")
    .insert([input])
    .select()
    .single();
  if (error) return { data: null, error: toServiceError(error) };
  return { data: data as OrderPayment, error: null };
};

export const updateOrderPaymentStatus = async (
  paymentId: string,
  status: SplitPaymentStatus
): Promise<{ error: ServiceError | null }> => {
  const { error } = await supabase
    .from("order_payments")
    .update({ payment_status: status })
    .eq("id", paymentId);
  if (error) return { error: toServiceError(error) };
  return { error: null };
};

export const deleteOrderPayment = async (paymentId: string) => {
  const { error } = await supabase
    .from("order_payments")
    .delete()
    .eq("id", paymentId);
  if (error) return { error: toServiceError(error) };
  return { error: null as ServiceError | null };
};

/**
 * Marca el pedido como dividido (is_split=true, split_count=N).
 */
export const markOrderAsSplit = async (
  orderId: string,
  splitCount: number
): Promise<{ error: ServiceError | null }> => {
  const { error } = await supabase
    .from("orders")
    .update({ is_split: true, split_count: splitCount })
    .eq("id", orderId);
  if (error) return { error: toServiceError(error) };
  return { error: null };
};

/**
 * RPC: valida que la suma de pagos paid >= total antes de cerrar la mesa.
 */
export const canCloseSplitOrder = async (
  orderId: string
): Promise<{ data: boolean | null; error: ServiceError | null }> => {
  const { data, error } = await supabase.rpc("can_close_split_order", {
    p_order_id: orderId,
  });
  if (error) return { data: null, error: toServiceError(error) };
  return { data: data as boolean, error: null };
};

/**
 * Helpers de cálculo puros (testeables sin mock).
 */

/** Divide un total en N partes iguales, devolviendo cada parte y el resto. */
export const splitEqually = (total: number, people: number, decimals = 0): { parts: number[]; remainder: number } => {
  if (people <= 0) return { parts: [], remainder: total };
  return { parts: distributeMoney(total, people, decimals), remainder: 0 };
};
export const validateSplitTotals = (amounts: number[], total: number, decimals = 0) => {
  try {
  const units = amounts.map(value => toMinorUnits(value, decimals));
  const sum = units.reduce((a, b) => a + b, 0);
  const difference = toMinorUnits(total, decimals) - sum;
  return { valid: amounts.length>0 && amounts.every((v,i) => v > 0 && Number.isFinite(v) && fromMinorUnits(units[i],decimals)===v) && difference === 0,
    sum: fromMinorUnits(sum, decimals), difference: fromMinorUnits(difference, decimals) };
  } catch {return {valid:false,sum:0,difference:0};}
};
