import { errorMessage } from "../../shared/errors";
// =====================================================================
// Frontend Service: flowService.ts
// Centraliza las llamadas a las Edge Functions de Flow.cl en Supabase
// =====================================================================

import { supabase } from "../config/supabase";

export interface FlowCheckoutResult {
  success: boolean;
  url?: string;
  token?: string;
  flowOrder?: number;
  error?: string;
}

export interface FlowCardRegisterResult {
  success: boolean;
  url?: string;
  token?: string;
  error?: string;
}

export interface FlowCardStatusResult {
  success: boolean;
  status?: string;
  creditCardType?: string;
  last4CardDigits?: string;
  customerId?: string;
  error?: string;
}

export interface FlowSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  status?: number;
  moleskinData?: {
    url: string;
    token: string;
  };
  error?: string;
}

export interface FlowCancelResult {
  success: boolean;
  status?: number;
  message?: string;
  error?: string;
}

export interface FlowSubscriptionStatus {
  success: boolean;
  subscription?: {
    id: string;
    status: number;
    subscription_start: string;
    trial_ends_at: string | null;
    current_period_start: string;
    current_period_end: string | null;
    flow_plans: {
      id: string;
      name: string;
      amount: number;
      currency: string;
    } | null;
  } | null;
  error?: string;
}

/**
 * Inicia el checkout inicial de registro para el plan Starter o Pro
 */
export async function createFlowCheckout(
  registrationRequestId: string,
  plan: "starter" | "pro" | "lifetime"
): Promise<FlowCheckoutResult> {
  try {
    const { data, error } = await supabase.functions.invoke("flow-checkout", {
      body: { registration_request_id: registrationRequestId, plan, origin: window.location.origin },
    });

    if (error) throw error;
    return data as FlowCheckoutResult;
  } catch (err: unknown) {
    console.error("[flowService] Error al crear checkout Flow:", err);
    return { success: false, error: errorMessage(err) || String(err) };
  }
}

/**
 * Inicia el registro/vinculación de una tarjeta de crédito en Flow
 */
export async function registerCard(restaurantId: string): Promise<FlowCardRegisterResult> {
  try {
    // La Edge Function rutea por pathname.
    const { data: resData, error: invokeErr } = await supabase.functions.invoke("flow-customer/register", {
      body: { restaurant_id: restaurantId },
    });

    if (invokeErr) throw invokeErr;
    return resData as FlowCardRegisterResult;
  } catch (err: unknown) {
    console.error("[flowService] Error al iniciar registro de tarjeta:", err);
    return { success: false, error: errorMessage(err) || String(err) };
  }
}

/**
 * Obtiene el estado del registro de la tarjeta usando el token retornado por Flow
 */
export async function getCardRegistrationStatus(token: string): Promise<FlowCardStatusResult> {
  try {
    const { data, error } = await supabase.functions.invoke(`flow-customer/register-status?token=${token}`, {
      method: "GET",
    });

    if (error) throw error;
    return data as FlowCardStatusResult;
  } catch (err: unknown) {
    console.error("[flowService] Error al obtener estado de registro de tarjeta:", err);
    return { success: false, error: errorMessage(err) || String(err) };
  }
}

/**
 * Desvincula la tarjeta registrada del restaurante
 */
export async function unregisterCard(restaurantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("flow-customer/unregister", {
      body: { restaurant_id: restaurantId },
    });

    if (error) throw error;
    return data as { success: boolean; error?: string };
  } catch (err: unknown) {
    console.error("[flowService] Error al desregistrar tarjeta:", err);
    return { success: false, error: errorMessage(err) || String(err) };
  }
}

/**
 * Crea una suscripción recurrente en Flow vinculando al restaurante con un plan
 */
export async function createSubscription(
  restaurantId: string,
  planId: "starter" | "pro"
): Promise<FlowSubscriptionResult> {
  try {
    const { data, error } = await supabase.functions.invoke("flow-subscription/create", {
      body: { restaurant_id: restaurantId, plan_id: planId },
    });

    if (error) throw error;
    return data as FlowSubscriptionResult;
  } catch (err: unknown) {
    console.error("[flowService] Error al crear suscripción en Flow:", err);
    return { success: false, error: errorMessage(err) || String(err) };
  }
}

/**
 * Cancela la suscripción activa
 * @param atPeriodEnd 0 = inmediato, 1 = al final del período de facturación actual
 */
export async function cancelSubscription(
  restaurantId: string,
  atPeriodEnd = 1
): Promise<FlowCancelResult> {
  try {
    const { data, error } = await supabase.functions.invoke("flow-subscription/cancel", {
      body: { restaurant_id: restaurantId, at_period_end: atPeriodEnd },
    });

    if (error) throw error;
    return data as FlowCancelResult;
  } catch (err: unknown) {
    console.error("[flowService] Error al cancelar suscripción:", err);
    return { success: false, error: errorMessage(err) || String(err) };
  }
}

/**
 * Obtiene el estado actual de la suscripción del restaurante
 */
export async function getSubscriptionStatus(restaurantId: string): Promise<FlowSubscriptionStatus> {
  try {
    const { data, error } = await supabase.functions.invoke(`flow-subscription/status?restaurant_id=${restaurantId}`, {
      method: "GET",
    });

    if (error) throw error;
    return data as FlowSubscriptionStatus;
  } catch (err: unknown) {
    console.error("[flowService] Error al obtener estado de suscripción:", err);
    return { success: false, error: errorMessage(err) || String(err) };
  }
}
