import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  ChefHat,
  BellRing,
  Delete,
  Lock,
  Loader2,
} from "lucide-react";
import { Loading } from "../../components/ui";
import {
  getRestaurantBySlug,
  kitchenLogin,
  kdsGetOrders,
  kdsGetRestaurant,
  partitionOrders,
  minutesSinceAccepted,
  storedKitchenToken,
  forgetKitchenToken,
  type KdsRestaurantInfo,
} from "../../services/kdsService";
import { formatCurrency } from "../../utils/helpers";
import type { LanguageCode } from "../../config/regional";
import type { Order } from "../../config/supabase";

// Textos del monitor de cocina por idioma de la carta del restaurante.
const KDS_T = {
  es: {
    loading: "Cargando monitor de cocina…",
    kitchen: "Cocina",
    monitor: "Monitor de Cocina",
    liveOrders: (n: number) =>
      `Monitor de Cocina · ${n} pedido${n === 1 ? "" : "s"} activo${n === 1 ? "" : "s"}`,
    live: "En vivo",
    noOrders: "Sin pedidos activos",
    noOrdersHint: "Los nuevos aparecerán aquí automáticamente.",
    new: "Nuevos",
    accepted: "Aceptados",
    preparing: "En Preparación",
    ready: "Listos",
    noOrdersCol: "Sin pedidos",
    min: "min",
    loginTitle: "Monitor de Cocina",
    loginDesc: "Ingresa el PIN de cocina configurado por el dueño.",
    badPin: "PIN incorrecto. Intenta nuevamente.",
    loadError: "No se pudo cargar el monitor. Intenta nuevamente.",
    slugError: "Restaurante no encontrado. Verifica la dirección (URL).",
    backHome: "Volver al inicio",
  },
  en: {
    loading: "Loading kitchen monitor…",
    kitchen: "Kitchen",
    monitor: "Kitchen Monitor",
    liveOrders: (n: number) =>
      `Kitchen Monitor · ${n} active order${n === 1 ? "" : "s"}`,
    live: "Live",
    noOrders: "No active orders",
    noOrdersHint: "New orders will appear here automatically.",
    new: "New",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    noOrdersCol: "No orders",
    min: "min",
    loginTitle: "Kitchen Monitor",
    loginDesc: "Enter the kitchen PIN configured by the owner.",
    badPin: "Wrong PIN. Try again.",
    loadError: "Could not load the monitor. Try again.",
    slugError: "Restaurant not found. Check the address (URL).",
    backHome: "Back to home",
  },
  pt: {
    loading: "Carregando o monitor de cozinha…",
    kitchen: "Cozinha",
    monitor: "Monitor de Cozinha",
    liveOrders: (n: number) =>
      `Monitor de Cozinha · ${n} pedido${n === 1 ? "" : "s"} ativo${n === 1 ? "" : "s"}`,
    live: "Ao vivo",
    noOrders: "Sem pedidos ativos",
    noOrdersHint: "Os novos aparecerão aqui automaticamente.",
    new: "Novos",
    accepted: "Aceitos",
    preparing: "Em Preparo",
    ready: "Prontos",
    noOrdersCol: "Sem pedidos",
    min: "min",
    loginTitle: "Monitor de Cozinha",
    loginDesc: "Digite o PIN de cozinha configurado pelo proprietário.",
    badPin: "PIN incorreto. Tente novamente.",
    loadError: "Não foi possível carregar o monitor. Tente novamente.",
    slugError: "Restaurante não encontrado. Verifique o endereço (URL).",
    backHome: "Voltar ao início",
  },
} as const;

type KdsText = (typeof KDS_T)["es"];

// La pantalla de cocina pública NO tiene sesión de Supabase, así que no puede
// usar Realtime (RLS de orders_events exige authenticated). Solución: polling
// cada 5s sobre kds_get_orders(token). El token se obtiene con kitchen_login
// (PIN de cocina) y se guarda en sessionStorage.

const POLL_INTERVAL = 5000;

const KDSPublic: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  return <KitchenMonitor key={restaurantSlug} restaurantSlug={restaurantSlug || ""} />;
};

const KitchenMonitor: React.FC<{restaurantSlug: string}> = ({restaurantSlug}) => {
  const [token, setToken] = useState(() => storedKitchenToken(restaurantSlug));
  const [phase, setPhase] = useState<"loading" | "login" | "board">(() => token ? "loading" : "login");
  const [restaurant, setRestaurant] = useState<KdsRestaurantInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setTick] = useState(0);

  // ---- Fase de arranque: resolver slug + token guardado -----------------
  // Si hay un token válido en sessionStorage, saltar directo al tablero.
  // La validación del token es async; mientras tanto, mostramos "loading".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!restaurantSlug) {
        return; // sin slug, la derivación inicial muestra login
      }
      const stored = storedKitchenToken(restaurantSlug);
      if (!stored) {
        return; // sin token, la derivación inicial muestra login
      }
      const [{ data: info }, {data: expected}] = await Promise.all([
        kdsGetRestaurant(stored), getRestaurantBySlug(restaurantSlug),
      ]);
      if (!cancelled && info && expected?.id === info.id) {
        setRestaurant(info);
        setPhase("board");
        return;
      }
      // Token inválido/expirado: limpiar para que la derivación muestre login.
      if (!cancelled) { forgetKitchenToken(restaurantSlug); setToken(null); setPhase("login"); }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantSlug]);

  // ---- Polling de pedidos (solo en fase board) ---------------------------
  useEffect(() => {
    if (phase !== "board") return;
    if (!token) {
      // Sin token: el effect de arranque se encarga de la transición a login.
      return;
    }
    let cancelled = false;
    const fetchOrders = async () => {
      const { data, error } = await kdsGetOrders(token);
      if (cancelled) return;
      if (error) {
        // El token vence a las 12 h o puede revocarse al iniciar otro monitor.
        // No mantenemos pedidos antiguos visibles tras perder autorización.
        forgetKitchenToken(restaurantSlug);
        setToken(null);
        setOrders([]);
        setRestaurant(null);
        setPhase("login");
        return;
      }
      if (data) setOrders(data);
    };
    fetchOrders();
    const id = setInterval(fetchOrders, POLL_INTERVAL);
    // Reloj para refrescar los minutos transcurridos de cada tarjeta.
    const clockId = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(clockId);
    };
  }, [phase, token, restaurantSlug]);

  const handleLoginSuccess = async (token: string, info: KdsRestaurantInfo) => {
    setToken(token);
    setRestaurant(info);
    setPhase("board");
    // Carga inmediata de pedidos.
    const { data } = await kdsGetOrders(token);
    if (data) setOrders(data);
  };

  const columns = useMemo(() => partitionOrders(orders), [orders]);

  // Idioma/moneda del restaurante (multi-país; default legacy es/CLP)
  const lang: LanguageCode =
    (restaurant?.default_language as LanguageCode) || "es";
  const t = (KDS_T[lang] ?? KDS_T.es) as KdsText;
  const fmt = (amount: number) =>
    formatCurrency(amount, restaurant?.currency || "CLP");

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loading text={t.loading} />
      </div>
    );
  }

  if (phase === "login") {
    return <KitchenLogin slug={restaurantSlug || ""} onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-bg p-4">
      {/* Cabecera */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{restaurant?.name || t.kitchen}</h1>
          <p className="text-text-secondary text-sm">
            {t.liveOrders(orders.length)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-success text-sm font-semibold">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
          {t.live}
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-secondary">
          <ChefHat className="w-16 h-16 mb-3 opacity-50" />
          <p className="text-lg">{t.noOrders}</p>
          <p className="text-sm">{t.noOrdersHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <PublicColumn title={t.new} icon={<Clock className="w-5 h-5" />} color="warning" orders={columns.pending} fmt={fmt} />
          <PublicColumn title={t.accepted} icon={<CheckCircle className="w-5 h-5" />} color="accent-secondary" orders={columns.accepted} fmt={fmt} />
          <PublicColumn title={t.preparing} icon={<ChefHat className="w-5 h-5" />} color="accent-secondary" orders={columns.preparing} fmt={fmt} />
          <PublicColumn title={t.ready} icon={<BellRing className="w-5 h-5" />} color="success" orders={columns.ready} fmt={fmt} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Columna (solo lectura: el KDS público NO cambia estados, solo los muestra)
// ---------------------------------------------------------------------------
interface PublicColumnProps {
  title: string;
  icon: React.ReactNode;
  color: "warning" | "accent-secondary" | "success";
  orders: Order[];
  fmt: (amount: number) => string;
}

const colorMap = {
  warning: "bg-warning/10 text-warning border-warning/30",
  "accent-secondary": "bg-accent-secondary/10 text-accent-secondary border-accent-secondary/30",
  success: "bg-success/10 text-success border-success/30",
};

const PublicColumn: React.FC<PublicColumnProps> = ({ title, icon, color, orders, fmt }) => (
  <div className="flex flex-col gap-3 min-w-0">
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colorMap[color]}`}>
      <span className="flex items-center gap-2 font-bold">
        {icon}
        {title}
      </span>
      <span className="text-sm font-bold bg-white/50 rounded-full w-6 h-6 flex items-center justify-center">
        {orders.length}
      </span>
    </div>
    <div className="flex flex-col gap-3">
      {orders.length === 0 ? (
        <p className="text-text-secondary text-xs text-center py-8 border border-dashed border-border rounded-lg">
          Sin pedidos
        </p>
      ) : (
        orders.map((order) => {
          const minutes = minutesSinceAccepted(order);
          const isLate = minutes > 15 && order.status !== "ready";
          return (
            <div
              key={order.id}
              className={`bg-surface border rounded-lg p-3 space-y-2 ${
                isLate ? "border-error/50 ring-1 ring-error/20" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-text text-sm">#{order.order_number}</span>
                {order.accepted_at && (
                  <span
                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                      isLate ? "bg-error/10 text-error" : "bg-bg-subtle text-text-secondary"
                    }`}
                  >
                    {minutes} min
                  </span>
                )}
              </div>
              {order.table_number && (
                <p className="text-xs text-text-secondary">📍 {order.table_number}</p>
              )}
              <ul className="space-y-1 text-sm">
                {order.items?.map((item, idx) => (
                  <li key={idx} className="text-text">
                    <span className="font-bold">{item.quantity}×</span> {item.name}
                  </li>
                ))}
              </ul>
              {order.customer_notes && (
                <p className="text-xs text-warning bg-warning/10 rounded p-1.5">
                  ⚠ {order.customer_notes}
                </p>
              )}
              <p className="text-xs text-text-secondary pt-1 border-t border-border">
                {fmt(order.total)}
              </p>
            </div>
          );
        })
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Login con PIN de cocina (keypad numérico)
// ---------------------------------------------------------------------------
interface KitchenLoginProps {
  slug: string;
  onSuccess: (token: string, info: KdsRestaurantInfo) => void;
}

const KitchenLogin: React.FC<KitchenLoginProps> = ({ slug, onSuccess }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Resolver el slug → restaurant_id para kitchen_login.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await getRestaurantBySlug(slug);
      if (cancelled) return;
      if (error || !data) {
        setSlugError("Restaurante no encontrado. Verifica la dirección (URL).");
        return;
      }
      setRestaurantId(data.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleSubmit = async () => {
    if (!restaurantId || pin.length < 4) return;
    setSubmitting(true);
    setError(null);
    const { data: token, error: lErr } = await kitchenLogin(restaurantId, pin, slug);
    setSubmitting(false);
    if (lErr || !token) {
      setError("PIN incorrecto. Intenta nuevamente.");
      setPin("");
      return;
    }
    const { data: info } = await kdsGetRestaurant(token);
    if (info?.id === restaurantId) {
      onSuccess(token, info);
    } else {
      setError("No se pudo cargar el monitor. Intenta nuevamente.");
      forgetKitchenToken(slug);
    }
  };

  const pressDigit = (d: string) => {
    if (pin.length >= 32) return;
    setPin((p) => p + d);
  };

  if (slugError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-lg p-8 text-center space-y-3">
          <p className="text-error font-semibold">{slugError}</p>
          <a href="/" className="text-accent text-sm underline">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="max-w-sm w-full bg-surface border border-border rounded-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-text">Monitor de Cocina</h1>
          <p className="text-text-secondary text-sm">
            Ingresa el PIN de cocina configurado por el dueño.
          </p>
        </div>

        {/* Display del PIN */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < pin.length ? "bg-accent" : "bg-bg-subtle border border-border"
              }`}
            />
          ))}
        </div>

        {error && <p className="text-error text-sm text-center">{error}</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => pressDigit(d)}
              className="aspect-square text-2xl font-bold rounded-lg border border-border hover:bg-bg-subtle transition"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="aspect-square flex items-center justify-center rounded-lg border border-border hover:bg-bg-subtle transition"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            onClick={() => pressDigit("0")}
            className="aspect-square text-2xl font-bold rounded-lg border border-border hover:bg-bg-subtle transition"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || pin.length < 4 || !restaurantId}
            className="aspect-square flex items-center justify-center rounded-lg bg-accent text-white hover:bg-accent/90 transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KDSPublic;
