import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, Receipt } from "lucide-react";
import { Button, Card, Loading, Alert } from "../../components/ui";
import {
  getTableByToken,
  startSession,
  getTableOrders,
  requestPayment,
  getCheckoutReceipt,
  calcTipFromPercent,
  sumSessionTotal,
  calcPaymentAmount,
  type TableByToken,
  type TableOrderSummary,
} from "../../services/tableService";
import { formatCurrency, getCurrencyDecimals } from "../../utils/helpers";

const TIP_OPTIONS = [0, 10, 15, 20];

const QRPayment: React.FC = () => {
  const { qrToken } = useParams<{ qrToken: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const paid = params.get("paid"); // "ok" | "error" | null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [table, setTable] = useState<TableByToken | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<TableOrderSummary[]>([]);

  const [tipPct, setTipPct] = useState<number>(0);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Pago Mercado Pago en curso (Fase 2): datos PIX/ticket + polling
  const [mpPayment, setMpPayment] = useState<{
    pixQrCode: string | null;
    pixQrBase64: string | null;
    ticketUrl: string | null;
    paymentId: string | null;
  } | null>(null);
  const [mpWaiting, setMpWaiting] = useState(false);
  const [receiptToken, setReceiptToken] = useState<string|null>(()=>new URLSearchParams(window.location.hash.slice(1)).get("receipt") || sessionStorage.getItem(`receipt:${qrToken}`));
  const [confirmed, setConfirmed] = useState(false);
  useEffect(()=>{if(window.location.hash.includes("receipt="))window.history.replaceState(null,"",window.location.pathname);},[]);

  // Resolver mesa → sesión → estado + pedidos, una sola vez por qrToken.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!qrToken || receiptToken) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      const { data: tbl, error: tErr } = await getTableByToken(qrToken);
      if (cancelled) return;
      if (tErr || !tbl) {
        setError("Mesa no encontrada.");
        setLoading(false);
        return;
      }
      setTable(tbl);
      // Reutiliza la sesión activa si existe (idempotente en la RPC).
      const { data: sess } = await startSession(qrToken);
      if (cancelled) return;
      if (!sess) {
        setError("No se pudo abrir la sesión de la mesa.");
        setLoading(false);
        return;
      }
      setSessionToken(sess.session_token);
      const { data: ords } = await getTableOrders(sess.session_token);
      if (cancelled) return;
      if (ords) setOrders(ords);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [qrToken, receiptToken]);

  // Moneda/idioma del restaurante (multi-país; default legacy CLP/es)
  const currency = table?.restaurant_currency || "CLP";
  const fmt = (amount: number) => formatCurrency(amount, currency);
  const language =
    (table?.restaurant_language as "es" | "en" | "pt" | undefined) || "es";

  const ordersTotal = useMemo(() => sumSessionTotal(orders,getCurrencyDecimals(currency)), [orders,currency]);
  const tipAmount = useMemo(
    () => calcTipFromPercent(ordersTotal, tipPct, getCurrencyDecimals(currency)),
    [ordersTotal, tipPct, currency]
  );
  const totalToPay = useMemo(
    () => calcPaymentAmount(orders, tipAmount,getCurrencyDecimals(currency)),
    [orders, tipAmount,currency]
  );

  const handlePay = async () => {
    if (!sessionToken) return;
    setPaying(true);
    setPayError(null);
    const { data, error: rErr } = await requestPayment({
      session_token: sessionToken,
      tip_amount: tipAmount,
    });
    setPaying(false);
    if(data?.receipt_token) {setReceiptToken(data.receipt_token);sessionStorage.setItem(`receipt:${qrToken}`,data.receipt_token);}
    if (rErr || !data || !data.success) {
      setPayError(
        rErr?.message || data?.error || "No se pudo iniciar el pago. Intenta nuevamente."
      );
      return;
    }
    // Mercado Pago (BR/PE): PIX muestra QR copia-y-paga con polling;
    // tarjeta abre el ticket de MP. La confirmación real llega vía webhook
    // y se detecta con getSessionByToken (status closed).
    if (data.provider === "mp") {
      setMpPayment({
        pixQrCode: data.pix_qr_code || null,
        pixQrBase64: data.pix_qr_base64 || null,
        ticketUrl: data.url || null,
        paymentId: data.payment_id || null,
      });
      setMpWaiting(true);
      return;
    }
    // Flow (Chile): redirigir al checkout.
    if (!data.url) {
      setPayError(data?.error || "No se pudo iniciar el pago. Intenta nuevamente.");
      return;
    }
    window.location.href = data.url;
  };

  useEffect(() => {
    if(!receiptToken)return;
    let cancelled=false;
    const poll=async()=>{
      const {data,error:receiptError}=await getCheckoutReceipt(receiptToken);
      if(cancelled)return;
      if(receiptError) {setPayError("No se pudo consultar la confirmación. Reintenta la consulta.");return;}
      if(data?.state==="confirmed") {setConfirmed(true);setMpWaiting(false);sessionStorage.removeItem(`receipt:${qrToken}`);}
      else if(data?.state==="rejected" || data?.state==="cancelled") {setReceiptToken(null);setMpWaiting(false);sessionStorage.removeItem(`receipt:${qrToken}`);setPayError("El proveedor rechazó o canceló el pago.");}
    };
    void poll();const id=setInterval(()=>void poll(),5000);
    return ()=>{cancelled=true;clearInterval(id);};
  },[receiptToken,qrToken]);

  // Pantalla de espera Mercado Pago (PIX/tarjeta BR/PE, Fase 2)
  if (mpWaiting && mpPayment) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <h1 className="text-xl font-bold text-text">
            {language === "pt" ? "Complete o pagamento" : language === "en" ? "Complete your payment" : "Completa tu pago"}
          </h1>
          {mpPayment.pixQrBase64 ? (
            <>
              <img
                src={`data:image/png;base64,${mpPayment.pixQrBase64}`}
                alt="PIX QR"
                className="w-64 h-64 mx-auto rounded-lg border border-border"
              />
              <p className="text-sm text-text-secondary">
                {language === "pt"
                  ? "Escaneie com o app do seu banco (PIX). A mesa fecha automaticamente após a confirmação."
                  : language === "en"
                  ? "Scan with your bank app (PIX). The table closes automatically after confirmation."
                  : "Escanea con la app de tu banco (PIX). La mesa se cierra automáticamente tras la confirmación."}
              </p>
            </>
          ) : mpPayment.ticketUrl ? (
            <>
              <p className="text-sm text-text-secondary">
                {language === "pt"
                  ? "Conclua o pagamento pelo link abaixo. A mesa fecha automaticamente após a confirmação."
                  : language === "en"
                  ? "Complete the payment via the link below. The table closes automatically after confirmation."
                  : "Completa el pago con el siguiente enlace. La mesa se cierra automáticamente tras la confirmación."}
              </p>
              <Button className="w-full" onClick={() => window.open(mpPayment.ticketUrl!, "_blank")}>
                {language === "pt" ? "Abrir página de pago" : language === "en" ? "Open payment page" : "Abrir página de pago"}
              </Button>
            </>
          ) : (
            <Loader2 className="w-10 h-10 text-accent mx-auto animate-spin" />
          )}
          <p className="text-xs text-text-secondary flex items-center justify-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            {language === "pt" ? "Aguardando confirmação…" : language === "en" ? "Waiting for confirmation…" : "Esperando confirmación…"}
          </p>
        </Card>
      </div>
    );
  }

  // Pantalla de éxito (?paid=ok).
  if (confirmed) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle className="w-20 h-20 text-accent mx-auto" />
          <h1 className="text-2xl font-bold text-text">¡Pago completado!</h1>
          <p className="text-text-secondary">
            Gracias por tu visita. Tu cuenta ha sido pagada y la cocina fue notificada.
          </p>
          <p className="text-xs text-text-secondary">
            Este comprobante no tiene valor tributario.
          </p>
          <Button className="w-full" onClick={() => navigate("/")}>
            Listo
          </Button>
        </Card>
      </div>
    );
  }

  if(receiptToken) return <div className="p-8"><Card className="p-6"><Loader2 className="animate-spin"/><p>Esperando confirmación del proveedor. Conserva esta pantalla para consultar tu pago.</p>{payError && <Alert type="error" message={payError}/>}</Card></div>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-3">
          <Alert type="error" message={error} />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-12">
      <header className="bg-surface border-b border-border">
        <div className="container-custom py-4">
          <h1 className="text-xl font-bold text-text flex items-center gap-2">
            <Receipt className="w-5 h-5 text-accent" />
            Pagar cuenta · {table?.table_number}
          </h1>
        </div>
      </header>

      <main className="container-custom pt-6 max-w-lg">
        {paid === "error" && (
          <Alert
            type="error"
            message="El pago fue rechazado o cancelado. Puedes intentar nuevamente."
            className="mb-4"
          />
        )}
        {payError && (
          <Alert type="error" message={payError} className="mb-4" />
        )}

        {/* Detalle de pedidos */}
        <Card className="p-4 mb-4">
          <h2 className="font-semibold text-text mb-3">Detalle</h2>
          {orders.length === 0 ? (
            <p className="text-text-secondary text-sm py-4 text-center">
              No hay pedidos en tu cuenta.
            </p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text">
                      Pedido {o.order_number}
                    </p>
                    <p className="text-text-secondary text-xs">
                      {o.items
                        ?.map(
                          (i: { name: string; quantity: number }) =>
                            `${i.quantity}× ${i.name}`
                        )
                        .join(", ")}
                    </p>
                  </div>
                  <span className="font-semibold text-text whitespace-nowrap">
                    {fmt(o.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border mt-3 pt-3 flex items-center justify-between font-semibold">
            <span>Subtotal cuenta</span>
            <span>{fmt(ordersTotal)}</span>
          </div>
        </Card>

        {/* Selector de propina */}
        <Card className="p-4 mb-4">
          <h2 className="font-semibold text-text mb-3">Propina (opcional)</h2>
          <div className="grid grid-cols-4 gap-2">
            {TIP_OPTIONS.map((pct) => (
              <button
                key={pct}
                onClick={() => setTipPct(pct)}
                className={`py-2 rounded-lg font-semibold text-sm border-2 transition ${
                  tipPct === pct
                    ? "border-accent bg-accent text-white"
                    : "border-border text-text hover:border-accent/50"
                }`}
              >
                {pct === 0 ? "Sin" : `${pct}%`}
              </button>
            ))}
          </div>
          {tipAmount > 0 && (
            <p className="text-sm text-text-secondary mt-2">
              Propina: <strong>{fmt(tipAmount)}</strong>
            </p>
          )}
        </Card>

        {/* Total */}
        <Card className="p-4 bg-accent/5 border-accent/30">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-text">Total a pagar</span>
            <span className="text-2xl font-bold text-accent">
              {fmt(totalToPay)}
            </span>
          </div>
          {["CL","BR","PE"].includes(table?.restaurant_country || "CL") ? (
            <>
              <Button
                className="w-full mt-4"
                onClick={handlePay}
                disabled={paying || ordersTotal <= 0}
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" /> Procesando…
                  </>
                ) : (
                  currency==="CLP"?"Pagar con Flow":"Pagar cuenta"
                )}
              </Button>
              <p className="text-xs text-text-secondary text-center mt-2">
                Serás redirigido a Flow.cl para completar el pago de forma segura.
              </p>
            </>
          ) : (
            <>
              <div className="bg-bg-subtle border border-border rounded-lg p-4 mt-4 text-center">
                <p className="text-sm text-text font-semibold">Pago en el local</p>
                <p className="text-xs text-text-secondary mt-1">
                  El pago con tarjeta en línea no está disponible aún en este país.
                  Coordina el pago directamente con el personal del restaurante.
                </p>
              </div>
            </>
          )}
        </Card>

        <button
          onClick={() => navigate(`/mesa/${qrToken}`)}
          className="text-sm text-text-secondary underline mx-auto block mt-4"
        >
          ← Volver a la mesa
        </button>
      </main>
    </div>
  );
};

export default QRPayment;
