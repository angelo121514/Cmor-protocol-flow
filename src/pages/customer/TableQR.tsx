import {sumMoney,multiplyMoney,currencyDecimals} from "../../../shared/money";
import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Minus, CheckCircle, Receipt, Loader2, Utensils } from "lucide-react";
import { Button, Card, Input, Modal, Loading, Alert } from "../../components/ui";
import { subscribeToMenuItems } from "../../services/restaurantService";
import { getTableByToken, startSession, getTableOrders, createTableOrder, sumSessionTotal, type TableByToken, type TableOrderSummary } from "../../services/tableService";
import type { MenuItem } from "../../config/supabase";
import { formatCurrency } from "../../utils/helpers";
import { type LanguageCode } from "../../config/regional";

// Mini-diccionario de la interfaz de mesa QR (es/en/pt). La carta misma
// (nombres/descripciones) sigue el idioma en que el restaurante las cargó.
const T = {
  es: {
    table: "Mesa",
    cart: "Carrito",
    yourBill: "Tu cuenta",
    requestBill: "Pedir la Cuenta",
    menuTitle: "Carta",
    noProducts: "No hay productos disponibles.",
    yourCart: "Tu Carrito",
    cartEmpty: "Tu carrito está vacío.",
    nameOptional: "Tu nombre (opcional)",
    namePlaceholder: "Ej: Juan",
    phoneOptional: "Teléfono (opcional)",
    phonePlaceholder: "+569...",
    notesOptional: "Comentarios (opcional)",
    notesPlaceholder: "Ej: sin cebolla",
    total: "Total",
    sending: "Enviando…",
    sendOrder: "Enviar Pedido a Cocina",
    orderSent: "¡Pedido enviado!",
    orderSentDesc: "Tu pedido fue recibido por la cocina. Cuando quieras irte, pulsa",
    keepOrdering: "Seguir pidiendo",
    errTable: "Esta mesa no está disponible. Escanea el QR de tu mesa nuevamente.",
    errSession: "No se pudo iniciar la sesión de la mesa. Intenta de nuevo.",
    errEmptyCart: "Tu carrito está vacío.",
    errSubmit: "No se pudo enviar el pedido. Intenta nuevamente.",
    backHome: "Volver al inicio",
  },
  en: {
    table: "Table",
    cart: "Cart",
    yourBill: "Your bill",
    requestBill: "Request the Bill",
    menuTitle: "Menu",
    noProducts: "No products available.",
    yourCart: "Your Cart",
    cartEmpty: "Your cart is empty.",
    nameOptional: "Your name (optional)",
    namePlaceholder: "e.g. John",
    phoneOptional: "Phone (optional)",
    phonePlaceholder: "+569...",
    notesOptional: "Comments (optional)",
    notesPlaceholder: "e.g. no onions",
    total: "Total",
    sending: "Sending…",
    sendOrder: "Send Order to Kitchen",
    orderSent: "Order sent!",
    orderSentDesc: "Your order was received by the kitchen. When you want to leave, press",
    keepOrdering: "Keep ordering",
    errTable: "This table is not available. Scan your table's QR code again.",
    errSession: "Could not start the table session. Try again.",
    errEmptyCart: "Your cart is empty.",
    errSubmit: "Could not send the order. Please try again.",
    backHome: "Back to home",
  },
  pt: {
    table: "Mesa",
    cart: "Carrinho",
    yourBill: "Sua conta",
    requestBill: "Pedir a Conta",
    menuTitle: "Menu",
    noProducts: "Nenhum produto disponível.",
    yourCart: "Seu Carrinho",
    cartEmpty: "Seu carrinho está vazio.",
    nameOptional: "Seu nome (opcional)",
    namePlaceholder: "Ex: João",
    phoneOptional: "Telefone (opcional)",
    phonePlaceholder: "+5511...",
    notesOptional: "Comentários (opcional)",
    notesPlaceholder: "Ex: sem cebola",
    total: "Total",
    sending: "Enviando…",
    sendOrder: "Enviar Pedido para a Cozinha",
    orderSent: "Pedido enviado!",
    orderSentDesc: "Seu pedido foi recebido pela cozinha. Quando quiser sair, toque em",
    keepOrdering: "Continuar pedindo",
    errTable: "Esta mesa não está disponível. Escaneie o QR da sua mesa novamente.",
    errSession: "Não foi possível iniciar a sessão da mesa. Tente novamente.",
    errEmptyCart: "Seu carrinho está vazio.",
    errSubmit: "Não foi possível enviar o pedido. Tente novamente.",
    backHome: "Voltar ao início",
  },
} as const;

interface CartLine {
  item: MenuItem;
  quantity: number;
}

const TableQR: React.FC = () => {
  const { qrToken } = useParams<{ qrToken: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<TableByToken | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orders, setOrders] = useState<TableOrderSummary[]>([]);

  // form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  // Idioma/moneda según el restaurante (multi-país; default legacy es/CLP)
  const lang: LanguageCode =
    (table?.restaurant_language as LanguageCode) || "es";
  const t = T[lang] ?? T.es;
  const currency = table?.restaurant_currency || "CLP";
  const fmt = (amount: number) => formatCurrency(amount, currency);
  // Nombre del plato: traducción pt de BD si existe (Fase 2)
  const itemName = (item: Pick<MenuItem, "name" | "name_pt">) =>
    lang === "pt" && item.name_pt ? item.name_pt : item.name;

  // 1. Resolver mesa + abrir sesión.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!qrToken) return;
      setLoading(true);
      setError(null);
      const { data: tbl, error: tErr } = await getTableByToken(qrToken);
      if (cancelled) return;
      if (tErr || !tbl) {
        setError(T.es.errTable);
        setLoading(false);
        return;
      }
      setTable(tbl);
      const tr = T[(tbl.restaurant_language as LanguageCode) || "es"] ?? T.es;
      const { data: sess, error: sErr } = await startSession(qrToken);
      if (cancelled) return;
      if (sErr || !sess) {
        setError(tr.errSession);
        setLoading(false);
        return;
      }
      setSessionToken(sess.session_token);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [qrToken]);

  // 2. Suscribirse al menú del restaurante (realtime).
  useEffect(() => {
    if (!table) return;
    const unsub = subscribeToMenuItems(table.restaurant_id, (items) => {
      setMenuItems(items.filter((i) => i.is_available));
    });
    return () => {
      void unsub.unsubscribe();
    };
  }, [table]);

  // 3. Cargar pedidos existentes de la sesión (polling cada 15s).
  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    const refresh = async () => {
      const { data: ords } = await getTableOrders(sessionToken);
      if (!cancelled && ords) setOrders(ords);
    };
    refresh();
    const id = setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionToken]);

  // Refresco manual tras enviar un pedido (el polling se ocupa del resto).
  const refreshOrders = useCallback(async () => {
    if (!sessionToken) return;
    const { data: ords } = await getTableOrders(sessionToken);
    if (ords) setOrders(ords);
  }, [sessionToken]);

  // ---- Carrito ----------------------------------------------------------
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const changeQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.item.id === itemId ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = sumMoney(cart.map(l=>multiplyMoney(l.item.base_price,l.quantity,currencyDecimals(table?.restaurant_currency || "CLP"))),currencyDecimals(table?.restaurant_currency || "CLP"));
  const sessionTotal = sumSessionTotal(orders);

  // ---- Enviar pedido ----------------------------------------------------
  const handleSendOrder = async () => {
    if (!sessionToken) return;
    if (cart.length === 0) {
      setSubmitError(t.errEmptyCart);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const { data, error: cErr } = await createTableOrder({
      session_token: sessionToken,
      items: cart.map((l) => ({
        menu_item_id: l.item.id,
        quantity: l.quantity,
      })),
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      customer_notes: notes || undefined,
    });
    setSubmitting(false);
    if (cErr || !data || data.success === false) {
      setSubmitError(
        cErr?.message ||
          data?.error ||
          t.errSubmit
      );
      return;
    }
    setCart([]);
    setCartOpen(false);
    setNotes("");
    setSuccessOpen(true);
    await refreshOrders();
  };

  // ---- Pedir la cuenta --------------------------------------------------
  const handleRequestBill = () => {
    if (!qrToken) return;
    navigate(`/mesa/${qrToken}/pagar`);
  };

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
          <a href="/" className="text-accent text-sm underline">
            {t.backHome}
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-28">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="container-custom py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">{t.table}</p>
            <h1 className="text-lg font-bold text-text">{table?.table_number}</h1>
          </div>
          <Button
            variant="secondary"
            onClick={() => setCartOpen(true)}
            className="relative"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="ml-1">{t.cart}</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Estado de la cuenta */}
      {sessionTotal > 0 && (
        <div className="container-custom pt-4">
          <Card className="p-4 bg-accent/5 border-accent/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-accent" />
                <span className="font-semibold text-text">{t.yourBill}</span>
              </div>
              <span className="text-xl font-bold text-accent">
                {fmt(sessionTotal)}
              </span>
            </div>
            <Button className="w-full mt-3" onClick={handleRequestBill}>
              Pedir la Cuenta
            </Button>
          </Card>
        </div>
      )}

      {/* Menú */}
      <main className="container-custom pt-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
          {t.menuTitle}
        </h2>
        {menuItems.length === 0 ? (
          <p className="text-text-secondary text-sm py-12 text-center">
            {t.noProducts}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <Card key={item.id} className="p-4 flex gap-3 items-center">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-subtle flex items-center justify-center flex-shrink-0">
                    <Utensils className="w-6 h-6 text-text-secondary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text truncate">{itemName(item)}</h3>
                  {item.description && (
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {lang === "pt" && item.description_pt ? item.description_pt : item.description}
                    </p>
                  )}
                  <p className="text-accent font-bold text-sm mt-1">
                    {fmt(item.base_price)}
                  </p>
                </div>
                <Button size="sm" onClick={() => addToCart(item)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Modal carrito */}
      <Modal isOpen={cartOpen} onClose={() => setCartOpen(false)} title={t.yourCart}>
        <div className="space-y-3">
          {cart.length === 0 ? (
            <p className="text-text-secondary text-sm py-6 text-center">
              {t.cartEmpty}
            </p>
          ) : (
            cart.map((line) => (
              <div key={line.item.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text truncate">{itemName(line.item)}</p>
                  <p className="text-sm text-text-secondary">
                    {fmt(line.item.base_price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeQty(line.item.id, -1)}
                    className="w-7 h-7 rounded-full bg-subtle flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-semibold">{line.quantity}</span>
                  <button
                    onClick={() => changeQty(line.item.id, 1)}
                    className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}

          <div className="border-t border-border pt-3 space-y-2">
            <Input
              label={t.nameOptional}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t.namePlaceholder}
            />
            <Input
              label={t.phoneOptional}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={t.phonePlaceholder}
            />
            <Input
              label={t.notesOptional}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
            />
          </div>

          {submitError && <Alert type="error" message={submitError} />}

          <div className="flex items-center justify-between font-bold">
            <span>{t.total}</span>
            <span className="text-accent">{fmt(cartTotal)}</span>
          </div>

          <Button
            className="w-full"
            onClick={handleSendOrder}
            disabled={submitting || cart.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" /> {t.sending}
              </>
            ) : (
              t.sendOrder
            )}
          </Button>
        </div>
      </Modal>

      {/* Modal éxito */}
      <Modal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        title={t.orderSent}
      >
        <div className="text-center space-y-4 py-4">
          <CheckCircle className="w-14 h-14 text-accent mx-auto" />
          <p className="text-text">
            {t.orderSentDesc}{" "}
            <strong>{t.requestBill}</strong>.
          </p>
          <Button className="w-full" onClick={() => setSuccessOpen(false)}>
            Seguir pidiendo
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default TableQR;
