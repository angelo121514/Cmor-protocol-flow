// =====================================================================
// Frontend Page: Subscription.tsx
// Página de gestión de suscripciones, tarjetas e historial de facturas
// =====================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  Trash2, 
  ShieldCheck, 
  Zap, 
  Receipt,
  RotateCw,
  PlusCircle
} from "lucide-react";
import { useFlowSubscription } from "../../hooks/useFlowSubscription";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../config/supabase";
import {readAllPages} from "../../services/pagination";
import { 
  Button, 
  Card, 
  Alert, 
  Badge 
} from "../../components/ui";

const SubscriptionPage: React.FC = () => {
  const { restaurant } = useAuth();
  const isLifetime = restaurant?.subscription_plan === "lifetime";
  const {
    loading: hookLoading,
    error: hookError,
    subscription,
    cardDetails,
    hasCardLinked,
    refresh,
    registerCard,
    unregisterCard,
    cancelSubscription,
    subscribe
  } = useFlowSubscription();

  const [payments, setPayments] = useState<{id:string;commerce_order:string;flow_order?:number;transaction_date?:string;amount:number;created_at:string;status:number}[]>([]);
  const [invoices, setInvoices] = useState<{id:string;amount:number;due_date:string;status:string}[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError,setHistoryError]=useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const historyVersion=useRef(0);

  // Cargar historial de pagos y facturas
  const loadBillingHistory = useCallback(async () => {
    if(!restaurant?.id)return;
    const version=++historyVersion.current;
    setLoadingHistory(true);setHistoryError("");setPayments([]);setInvoices([]);
    try {
      const payData=await readAllPages<(typeof payments)[number]>((from,to)=>supabase.from("flow_payments")
        .select("id,commerce_order,flow_order,transaction_date,amount,created_at,status").eq("restaurant_id",restaurant.id).order("id").range(from,to));
      const invData=subscription?.id?await readAllPages<(typeof invoices)[number]>((from,to)=>supabase.from("flow_invoices")
        .select("id,amount,due_date,status").eq("subscription_id",subscription.id).order("id").range(from,to)):[];
      if(version!==historyVersion.current)return;
      setPayments(payData.sort((a,b)=>b.created_at.localeCompare(a.created_at)));
      setInvoices(invData.sort((a,b)=>b.due_date.localeCompare(a.due_date)));
    }catch{if(version===historyVersion.current)setHistoryError("No se pudo cargar el historial de facturación. Intenta nuevamente.");}
    finally{if(version===historyVersion.current)setLoadingHistory(false);}
  }, [restaurant?.id,subscription?.id]);

  useEffect(() => {
    if (restaurant?.id) {
      loadBillingHistory();
    }
    return ()=>{historyVersion.current++;};
  }, [restaurant?.id, subscription?.id, loadBillingHistory]);

  // Manejar retorno de vinculación de tarjeta si la URL tiene params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const registerParam = urlParams.get("register");
    const tokenParam = urlParams.get("token");

    if (registerParam === "card" || tokenParam) {
      setActionSuccess("¡Estamos procesando tu tarjeta! Los datos se actualizarán en breve.");
      refresh();
      // Limpiar query params de la URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refresh]);

  const handleCancelClick = async () => {
    if (window.confirm("¿Estás seguro de que deseas cancelar tu suscripción activa al término del período de facturación actual?")) {
      const msg = await cancelSubscription(1); // 1 = al final del ciclo
      if (msg) {
        setActionSuccess(msg);
        refresh();
      }
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge variant="neutral">Creada</Badge>;
      case 1:
        return <Badge variant="success">Activa</Badge>;
      case 2:
        return <Badge variant="warning">Pago Atrasado</Badge>;
      case 3:
        return <Badge variant="error">Impaga</Badge>;
      case 4:
        return <Badge variant="error">Cancelada</Badge>;
      case 5:
        return <Badge variant="success">Periodo de Prueba (Trial)</Badge>;
      default:
        return <Badge variant="neutral">Desconocido</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: number) => {
    switch (status) {
      case 1: return <Badge variant="warning">Pendiente</Badge>;
      case 2: return <Badge variant="success">Pagado</Badge>;
      case 3: return <Badge variant="error">Rechazado</Badge>;
      case 4: return <Badge variant="neutral">Anulado</Badge>;
      default: return <Badge variant="neutral">Desconocido</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <Zap className="w-7 h-7 text-amber-500 fill-amber-500" />
            Plan de Suscripción
          </h1>
          <p className="text-text-secondary text-sm">
            Administra tus planes de pago, cobros automáticos e historial de facturas.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => { refresh(); loadBillingHistory(); }} 
          loading={hookLoading || loadingHistory}
          size="sm"
          className="border-border hover:bg-bg-subtle text-text flex items-center gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Actualizar</span>
        </Button>
      </div>

      {hookError && <Alert type="error" message={hookError} />}
      {historyError && <Alert type="error" message={historyError} />}
      {actionSuccess && <Alert type="success" message={actionSuccess} />}

      {/* Main Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Left Side: Subscription status card */}
        <Card className="md:col-span-2 space-y-6 bg-bg-subtle border-border/80">
          <div className="flex justify-between items-start border-b border-border pb-4">
            <div>
              <h3 className="font-bold text-lg text-text">Suscripción Actual</h3>
              <p className="text-xs text-text-secondary">Plan contratado en tu local</p>
            </div>
            {isLifetime ? (
              <Badge variant="success">De por vida</Badge>
            ) : subscription ? (
              getStatusBadge(subscription.status)
            ) : restaurant?.subscription_plan && restaurant.subscription_plan !== "free_trial" ? (
              <Badge variant="success">Activo (Sincronizado)</Badge>
            ) : (
              <Badge variant="neutral">Sin Plan Activo</Badge>
            )}
          </div>

          {isLifetime ? (
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider font-bold">Plan</label>
                  <strong className="text-xl text-text font-black uppercase mt-1 block">De por vida</strong>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider font-bold">Pago realizado</label>
                  <span className="text-lg font-black text-red-500 mt-1 block">$500.000 CLP</span>
                </div>
              </div>
              <div className="bg-bg/50 p-4 rounded-xl border border-border text-sm text-text-secondary leading-relaxed">
                Tu licencia está activa para siempre. No tienes mensualidades, renovaciones ni próximos cobros.
              </div>
            </div>
          ) : subscription ? (
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider font-bold">Plan</label>
                  <strong className="text-xl text-text font-black uppercase mt-1 block">
                    {subscription.flow_plans?.name || "Plan Personalizado"}
                  </strong>
                </div>

                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider font-bold">Monto mensual</label>
                  <span className="text-lg font-black text-red-500 mt-1 block">
                    ${subscription.flow_plans?.amount.toLocaleString("es-CL")} CLP
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-text-secondary" />
                  <div>
                    <label className="block text-xs text-text-secondary font-medium">Inicio Suscripción</label>
                    <span className="text-sm font-semibold text-text">
                      {new Date(subscription.subscription_start).toLocaleDateString("es-CL")}
                    </span>
                  </div>
                </div>

                {subscription.trial_ends_at && (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <div>
                      <label className="block text-xs text-text-secondary font-medium">Término Período de Prueba</label>
                      <span className="text-sm font-semibold text-text">
                        {new Date(subscription.trial_ends_at).toLocaleDateString("es-CL")}
                      </span>
                    </div>
                  </div>
                )}

                {subscription.current_period_end && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-text-secondary" />
                    <div>
                      <label className="block text-xs text-text-secondary font-medium">Próximo Cobro</label>
                      <span className="text-sm font-semibold text-text">
                        {new Date(subscription.current_period_end).toLocaleDateString("es-CL")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : restaurant?.subscription_plan && restaurant.subscription_plan !== "free_trial" ? (
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider font-bold">Plan</label>
                  <strong className="text-xl text-text font-black uppercase mt-1 block">
                    {(restaurant.subscription_plan as string) === "starter" ? "Básico (Starter)" : (restaurant.subscription_plan as string) === "pro" ? "Pro" : (restaurant.subscription_plan as string) === "lifetime" ? "De por vida" : restaurant.subscription_plan}
                  </strong>
                </div>

                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider font-bold">Monto mensual estimado</label>
                  <span className="text-lg font-black text-red-500 mt-1 block">
                    {(restaurant.subscription_plan as string) === "starter" ? "$35.000 CLP" : (restaurant.subscription_plan as string) === "pro" ? "$100.000 CLP" : "$0 CLP"}
                  </span>
                </div>
              </div>

              <div className="space-y-4 font-sans text-xs text-text-secondary leading-relaxed bg-bg/50 p-3 rounded-lg border border-border">
                <p>
                  <strong>Estado:</strong> Tu local se encuentra activo en el plan <strong>{restaurant.subscription_plan}</strong> en la base de datos de administración.
                </p>
                <p className="mt-1">
                  Si ya realizaste el pago y no ves los cobros recurrentes de Flow.cl reflejados aquí, se actualizará tan pronto la pasarela envíe la confirmación.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <AlertTriangle className="w-12 h-12 text-warning mx-auto" />
              <div>
                <h4 className="font-bold text-text">No posees una suscripción activa</h4>
                <p className="text-xs text-text-secondary max-w-sm mx-auto mt-1">
                  Para utilizar el sistema CMOR FLOW de forma indefinida, debes contratar un plan de pago básico o avanzado.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button 
                  onClick={() => subscribe("starter")}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Contratar Starter</span>
                </Button>
              </div>
            </div>
          )}

          {!isLifetime && subscription && subscription.status !== 4 && (
            <div className="border-t border-border pt-4 flex justify-end">
              <Button 
                onClick={handleCancelClick}
                variant="ghost" 
                size="sm"
                className="text-red-500 hover:bg-red-500/10 hover:text-red-600 font-bold"
              >
                Cancelar Suscripción
              </Button>
            </div>
          )}
        </Card>

        {/* Right Side: Linked Credit Card Info */}
        <Card className="space-y-6 bg-bg-subtle border-border/80 flex flex-col justify-between">
          {isLifetime ? (
            <div className="flex flex-col items-center justify-center text-center py-10 space-y-3">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
              <h3 className="font-bold text-lg text-text">Sin cobros recurrentes</h3>
              <p className="text-xs text-text-secondary max-w-xs">
                Tu compra de por vida no necesita una tarjeta vinculada. Flow solo procesó el pago único inicial.
              </p>
            </div>
          ) : (
          <>
          <div className="space-y-4">
            <div className="border-b border-border pb-4">
              <h3 className="font-bold text-lg text-text flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-text-secondary" />
                Medio de Pago
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">Tarjeta para cobros recurrentes</p>
            </div>

            {hasCardLinked ? (
              <div className="bg-bg border border-border rounded-xl p-4 space-y-3 relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-5">
                  <CreditCard className="w-24 h-24 text-text" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-text uppercase tracking-wider">
                    {cardDetails.creditCardType || "Tarjeta"}
                  </span>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="py-2">
                  <span className="font-mono text-lg text-text tracking-widest font-black">
                    •••• •••• •••• {cardDetails.last4CardDigits}
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  Los cobros de tu plan se realizarán de forma automática a esta tarjeta de crédito/débito.
                </p>
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-xl p-6 text-center space-y-3">
                <CreditCard className="w-8 h-8 text-text-secondary mx-auto opacity-60" />
                <div>
                  <h4 className="font-semibold text-text text-sm">Sin Tarjeta Vinculada</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    Para activar la recurrencia debes registrar una tarjeta.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border flex flex-col gap-2">
            <Button
              onClick={registerCard}
              fullWidth
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {hasCardLinked ? "Cambiar Tarjeta" : "Vincular Tarjeta"}
            </Button>

            {hasCardLinked && (
              <Button
                onClick={unregisterCard}
                variant="ghost"
                fullWidth
                size="sm"
                className="text-text-secondary hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desvincular Tarjeta</span>
              </Button>
            )}
          </div>
          </>
          )}
        </Card>
      </div>

      {/* Historial de Pagos y Facturas */}
      <div className="grid md:grid-cols-2 gap-6 pt-2">
        {/* Historial de Pagos */}
        <Card className="bg-bg-subtle border-border/80 space-y-4">
          <h3 className="font-bold text-lg text-text flex items-center gap-2 border-b border-border pb-3">
            <Receipt className="w-5 h-5 text-text-secondary" />
            Historial de Pagos
          </h3>
          
          <div className="overflow-x-auto">
            <table aria-label="Historial de Pagos" className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/50 text-text-secondary uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-2">Orden</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {payments.length > 0 ? (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-bg/40 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-text-secondary">#{p.flow_order}</td>
                      <td className="py-2.5 font-bold text-text">${p.amount.toLocaleString("es-CL")}</td>
                      <td className="py-2.5 text-text-secondary text-[11px]">
                        {new Date(p.transaction_date || p.created_at).toLocaleDateString("es-CL")}
                      </td>
                      <td className="py-2.5">{getPaymentStatusBadge(p.status)}</td>
                    </tr>
                  ))
                ) : historyError||loadingHistory ? null : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-text-secondary italic">
                      No se registran transacciones de pago.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Historial de Facturas */}
        <Card className="bg-bg-subtle border-border/80 space-y-4">
          <h3 className="font-bold text-lg text-text flex items-center gap-2 border-b border-border pb-3">
            <Receipt className="w-5 h-5 text-text-secondary" />
            Facturas de Suscripción
          </h3>

          <div className="overflow-x-auto">
            <table aria-label="Facturas de Suscripción" className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/50 text-text-secondary uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-2">Factura</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2">Vencimiento</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-bg/40 transition-colors">
                      <td className="py-2.5 font-mono text-[11px] text-text-secondary">#{inv.id}</td>
                      <td className="py-2.5 font-bold text-text">${inv.amount.toLocaleString("es-CL")}</td>
                      <td className="py-2.5 text-text-secondary text-[11px]">
                        {new Date(inv.due_date).toLocaleDateString("es-CL")}
                      </td>
                      <td className="py-2.5">
                        <Badge 
                          variant={
                            inv.status === "paid" 
                              ? "success" 
                              : inv.status === "pending" 
                                ? "warning" 
                                : "error"
                          }
                        >
                          {inv.status === "paid" ? "Pagada" : inv.status === "pending" ? "Pendiente" : "Vencida"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : historyError||loadingHistory ? null : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-text-secondary italic">
                      No se registran facturas emitidas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionPage;
