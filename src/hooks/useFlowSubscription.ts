import { errorMessage } from "../../shared/errors";
// =====================================================================
// Custom Hook: useFlowSubscription.ts
// Gestiona el estado de suscripción y registro de tarjetas del restaurante
// =====================================================================

import { useState, useEffect, useCallback,useRef } from "react";
import { useAuth } from "./useAuth";
import * as flowService from "../services/flowService";
import { supabase } from "../config/supabase";

export function useFlowSubscription() {
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<flowService.FlowSubscriptionStatus["subscription"]>(null);
  const [cardDetails, setCardDetails] = useState<{ creditCardType: string | null; last4CardDigits: string | null }>({
    creditCardType: null,
    last4CardDigits: null,
  });

  const hasCardLinked = !!cardDetails.last4CardDigits;
  const requestVersion=useRef(0);

  const loadSubscriptionData = useCallback(async () => {
    const version=++requestVersion.current;
    setSubscription(null);setCardDetails({creditCardType:null,last4CardDigits:null});
    if (!restaurant?.id) {setLoading(false);setError(null);return;}
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener estado de suscripción en BD
      const res = await flowService.getSubscriptionStatus(restaurant.id);
      if(version!==requestVersion.current)return;
      if(!res.success)throw new Error(res.error||"No se pudo consultar la suscripción");
      if (res.subscription) {
        setSubscription(res.subscription);
      } else {
        setSubscription(null);
      }

      // 2. Obtener detalles de tarjeta de la tabla flow_customers
      const { data: customer, error: customerError } = await supabase
        .from("flow_customers")
        .select("credit_card_type, last4_card_digits")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      if(customerError)throw customerError;
      if(version!==requestVersion.current)return;
      if (customer) {
        setCardDetails({
          creditCardType: customer.credit_card_type,
          last4CardDigits: customer.last4_card_digits,
        });
      } else {setCardDetails({creditCardType:null,last4CardDigits:null});}
    } catch (err: unknown) {
      if(version!==requestVersion.current)return;
      setSubscription(null);setCardDetails({creditCardType:null,last4CardDigits:null});
      console.error("[useFlowSubscription] Error cargando suscripción:", err);
      setError(errorMessage(err) || "Error al cargar la información de la suscripción");
    } finally {
      if(version===requestVersion.current)setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    loadSubscriptionData();
    return ()=>{requestVersion.current++;};
  }, [loadSubscriptionData]);

  /**
   * Inicia el registro de una tarjeta de crédito redirigiendo a Flow
   */
  const handleRegisterCard = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await flowService.registerCard(restaurant.id);
      if (res.success && res.url && res.token) {
        // Redirigir a la pasarela de Flow para vincular tarjeta
        window.location.href = `${res.url}?token=${res.token}`;
      } else {
        throw new Error(res.error || "No se pudo generar el token de registro");
      }
    } catch (err: unknown) {
      console.error("[useFlowSubscription] Error registrando tarjeta:", err);
      setError(errorMessage(err) || "Error al iniciar el registro de la tarjeta");
      setLoading(false);
    }
  };

  /**
   * Elimina la tarjeta vinculada
   */
  const handleUnregisterCard = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await flowService.unregisterCard(restaurant.id);
      if (res.success) {
        setCardDetails({ creditCardType: null, last4CardDigits: null });
        await loadSubscriptionData();
      } else {
        throw new Error(res.error || "Error al desvincular tarjeta");
      }
    } catch (err: unknown) {
      console.error("[useFlowSubscription] Error desregistrando tarjeta:", err);
      setError(errorMessage(err) || "Error al desvincular tarjeta");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela la suscripción actual (inmediata o al final del ciclo)
   */
  const handleCancelSubscription = async (atPeriodEnd = 1) => {
    if (!restaurant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await flowService.cancelSubscription(restaurant.id, atPeriodEnd);
      if (res.success) {
        await loadSubscriptionData();
        return res.message;
      } else {
        throw new Error(res.error || "Error al cancelar la suscripción");
      }
    } catch (err: unknown) {
      console.error("[useFlowSubscription] Error cancelando suscripción:", err);
      setError(errorMessage(err) || "Error al procesar la cancelación de la suscripción");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crea una nueva suscripción a un plan de Flow
   */
  const handleSubscribe = async (planId: "starter" | "pro") => {
    if (!restaurant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await flowService.createSubscription(restaurant.id, planId);
      if (res.success) {
        if (res.moleskinData?.url && res.moleskinData?.token) {
          // Requiere registrar tarjeta para iniciar cobro (primera vez)
          window.location.href = `${res.moleskinData.url}?token=${res.moleskinData.token}`;
        } else if (!hasCardLinked) {
          // Si no tiene tarjeta vinculada y Flow no retornó moleskinData, solicitar registro de tarjeta manualmente
          console.log("[useFlowSubscription] Suscripción creada en estado pendiente. Iniciando registro de tarjeta...");
          const regRes = await flowService.registerCard(restaurant.id);
          if (regRes.success && regRes.url && regRes.token) {
            window.location.href = `${regRes.url}?token=${regRes.token}`;
          } else {
            throw new Error(regRes.error || "Suscripción creada, pero debes vincular una tarjeta para activarla.");
          }
        } else {
          // Ya tiene tarjeta vinculada, cobro inmediato exitoso
          await loadSubscriptionData();
        }
      } else {
        throw new Error(res.error || "Error al suscribir al plan");
      }
    } catch (err: unknown) {
      console.error("[useFlowSubscription] Error suscribiendo a plan:", err);
      setError(errorMessage(err) || "Error al suscribir al plan");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    subscription,
    cardDetails,
    hasCardLinked: !!cardDetails.last4CardDigits,
    refresh: loadSubscriptionData,
    registerCard: handleRegisterCard,
    unregisterCard: handleUnregisterCard,
    cancelSubscription: handleCancelSubscription,
    subscribe: handleSubscribe,
  };
}
