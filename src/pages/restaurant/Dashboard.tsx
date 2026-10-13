import React from "react";
import {
  useNavigate,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  FileText,
  Settings,
  Users,
  BrainCircuit,
  Calculator,
  ShieldCheck,
  Zap,
  Package,
  QrCode,
  Monitor,
  BookOpen,
} from "lucide-react";
import { getTrialDaysLeft, isTrialExpired } from "../../utils/helpers";
import RestaurantHome from "./RestaurantHome";
import Orders from "./Orders";
import Menu from "./Menu";
import Reports from "./Reports";
import RestaurantSettings from "./RestaurantSettings";
import Crm from "./Crm";
import AiRecommendations from "./AiRecommendations";
import Pos from "./Pos";
import Inventory from "./Inventory";
import Waiters from "./Waiters";
import Tables from "./Tables";
import KDS from "./KDS";
import Privacy from "./Privacy";
import SubscriptionPage from "./Subscription";
import Accounting from "./Accounting";
import { FirstLoginPrivacyModal } from "../../components/privacy/FirstLoginPrivacyModal";
import { CmorFlowLogo } from "../../components/CmorFlowLogo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { RestaurantSwitcher } from "../../components/RestaurantSwitcher";
import { supabase } from "../../config/authClient";
import { useAuth } from "../../hooks/useAuth";
import { usePanelLang, panelLangForCountry } from "../../i18n/panel-language";

const RestaurantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, restaurant, loading } = useAuth();
  // Idioma del panel (Fase 2): pt para restaurantes de Brasil
  const { lang: panelLang, setLang: setPanelLang, t: tPanel } = usePanelLang();
  // Auto-detección (Fase 2): dueños brasileños entran en pt salvo que hayan
  // elegido idioma manualmente (se persiste en localStorage).
  React.useEffect(() => {
    try {
      if (!localStorage.getItem("cmor-panel-lang")) {
        setPanelLang(panelLangForCountry(restaurant?.country));
      }
    } catch {
      /* storage no disponible */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.country]);
  const restaurantId = restaurant?.id || null;
  const [pendingOrdersCount, setPendingOrdersCount] = React.useState(0);
  const [pendingQrCount, setPendingQrCount] = React.useState(0);

  React.useEffect(() => {
    if (!restaurantId) return;

    let active=true;
    const fetchCounts = async () => {
      const start=new Date();start.setHours(0,0,0,0);
      const {data,error}=await supabase.rpc("restaurant_dashboard",{p_restaurant_id:restaurantId,p_start:start.toISOString()});
      if(!error&&data&&active){setPendingOrdersCount(data.pendingOrders);setPendingQrCount(data.pendingQrCount);}

    };

    fetchCounts();

    const intervalId = setInterval(fetchCounts, 15000);

    const subscription = supabase
      .channel(`dashboard-orders-count-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      active=false;
      clearInterval(intervalId);
      subscription.unsubscribe();
    };
  }, [restaurantId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // El modo mock no expone signOut real: limpiamos el blob legado también.
    const { clearStoredSession } = await import("../../utils/helpers");
    clearStoredSession("user");
    navigate("/login");
  };

  // Mientras se resuelve la sesión mostramos nada (RequireRole ya muestra
  // spinner a nivel ruta); si no hay sesión, RequireRole redirige.
  if (loading || !user) return null;

  // Base navigation
  const navItems = [
    { path: "/restaurant", icon: LayoutDashboard, label: tPanel("Resumen") },
    { path: "/restaurant/pos", icon: Calculator, label: tPanel("POS") },
    { path: "/restaurant/orders", icon: ShoppingBag, label: tPanel("Pedidos") },
    { path: "/restaurant/kds", icon: Monitor, label: tPanel("Cocina") },
    { path: "/restaurant/menu", icon: UtensilsCrossed, label: tPanel("Menú") },
    { path: "/restaurant/reports", icon: FileText, label: tPanel("Reportes") },
  ];

  // Inventario: disponible para planes pro y enterprise (Fase 1)
  const hasInventory = ["pro", "enterprise"].includes(restaurant?.subscription_plan || "");
  if (hasInventory) {
    navItems.push(
      { path: "/restaurant/inventory", icon: Package, label: tPanel("Inventario") }
    );
  }

  // Meseros: disponible para planes pro y enterprise (Fase 2)
  if (hasInventory) {
    navItems.push(
      { path: "/restaurant/waiters", icon: Users, label: tPanel("Garzones") }
    );
  }

  // Mesas y QR: disponible para planes pro y enterprise (Fase 5)
  if (hasInventory) {
    navItems.push(
      { path: "/restaurant/tables", icon: QrCode, label: `${tPanel("Mesas")}/QR` }
    );
  }

  // Cierre de Caja: ahora integrado dentro de Caja POS (Fase 9).
  // Ya no se muestra como pestaña separada; se accede desde el POS.

  // CRM is available for free_trial, starter, and pro plans
  const hasCrm = ["free_trial", "starter", "pro"].includes(restaurant?.subscription_plan || "");
  if (hasCrm) {
    navItems.push(
      { path: "/restaurant/crm", icon: Users, label: "CRM" }
    );
  }

  // Contabilidad: DTE Chile vía el motor tributario (todos los planes, solo CL)
  if (restaurant?.country === "CL") {
    navItems.push(
      { path: "/restaurant/accounting", icon: BookOpen, label: tPanel("Contabilidad") }
    );
  }

  // Privacy (panel del titular: consentimientos + DSAR)
  navItems.push({ path: "/restaurant/privacy", icon: ShieldCheck, label: tPanel("Privacidad") });

  // Subscription (Flow.cl recurring billing)
  navItems.push({ path: "/restaurant/subscription", icon: Zap, label: tPanel("Suscripción") });

  // Settings
  navItems.push({ path: "/restaurant/settings", icon: Settings, label: tPanel("Configuración") });

  // If Pro plan, add AI Recommendations at the very end
  const isPro = restaurant?.subscription_plan === "pro";
  if (isPro) {
    navItems.push(
      { path: "/restaurant/ai", icon: BrainCircuit, label: "IA Sugerencias" }
    );
  }

  const trialExpired = isTrialExpired(restaurant?.subscription_plan, restaurant?.trial_ends_at);

  return (
    <div className="min-h-screen bg-bg-subtle transition-colors duration-200">
      {/* Top Navigation */}
      <nav className="bg-bg border-b border-border sticky top-0 z-40 transition-colors duration-200">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <CmorFlowLogo size="sm" showText={false} />
              <div>
                <div className="flex items-center gap-2">
                  <RestaurantSwitcher />
                  {restaurant && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      restaurant.subscription_plan === "free_trial"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : restaurant.subscription_plan === "pro"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-bg-subtle text-text-secondary border-border"
                    }`}>
                      {restaurant.subscription_plan === "free_trial"
                        ? `Prueba (${getTrialDaysLeft(restaurant.trial_ends_at)} días)`
                        : restaurant.subscription_plan === "starter"
                        ? "Starter"
                        : restaurant.subscription_plan === "pro"
                        ? "Pro"
                        : restaurant.subscription_plan === "enterprise"
                        ? "Enterprise"
                        : restaurant.subscription_plan}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {/* Idioma del panel (Fase 2) */}
              <select
                value={panelLang}
                onChange={(e) => setPanelLang(e.target.value as "es" | "pt")}
                className="bg-bg border border-border text-text text-xs rounded-lg px-1.5 py-1 font-semibold cursor-pointer"
                aria-label="Idioma"
              >
                <option value="es">ES</option>
                <option value="pt">PT</option>
              </select>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-text-secondary hover:text-error transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">{tPanel("Cerrar sesión")}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Warning Banner for Expired Trial */}
      {trialExpired && (
        <div className="bg-red-650 text-white text-center py-2.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition-all">
          <span>
            {panelLang === "pt"
              ? "⚠️ Seu período de avaliação de 14 dias expirou. O PDV de vendas e o Menu digital estão bloqueados."
              : "⚠️ Tu período de prueba de 14 días ha expirado. El POS de ventas y el Menú digital se encuentran bloqueados."}
          </span>
          <Link
            to="/restaurant/subscription"
            className="underline hover:text-red-100 font-bold ml-1 transition-all"
          >
            {panelLang === "pt" ? "Contratar Plano Agora" : "Contratar Plan Ahora"}
          </Link>
        </div>
      )}

      {/* Secondary Navigation */}
      <div className="bg-bg border-b border-border transition-colors duration-200">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6">
          <div
            className="restaurant-nav flex items-center justify-start lg:justify-center gap-0 overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`
              .restaurant-nav::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              let badgeCount = 0;
              if (item.path === "/restaurant/orders") {
                badgeCount = pendingOrdersCount;
              } else if (item.path === "/restaurant/pos") {
                badgeCount = pendingQrCount;
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex min-w-fit items-center gap-1 px-1.5 md:px-2.5 py-2 text-[11px] md:text-xs lg:text-sm border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-accent text-accent font-medium"
                      : "border-transparent text-text-secondary hover:text-text"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  <span>{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="bg-red-500 text-white text-[9px] md:text-[10px] font-extrabold px-1 py-0.5 rounded-full min-w-[16px] md:min-w-[18px] text-center animate-pulse">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-custom py-8">
        <Routes key={restaurantId}>
          <Route index element={<RestaurantHome />} />
          <Route path="pos" element={<Pos />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="waiters" element={<Waiters />} />
          <Route path="tables" element={<Tables />} />
          <Route path="kds" element={<KDS />} />
          {/* Caja: ya no es ruta separada; integrada en POS */}
          <Route path="cash" element={<Pos />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="reports" element={<Reports />} />
          <Route path="crm" element={<Crm />} />
          <Route path="ai" element={<AiRecommendations />} />
          <Route path="accounting" element={<Accounting />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="settings" element={<RestaurantSettings />} />
        </Routes>
      </div>

      {/* Aviso de privacidad obligatorio al primer login (Ley 21.719) */}
      <FirstLoginPrivacyModal />

      {/* Footer Branding */}
      <footer className="py-6 border-t border-border mt-12 text-center text-xs text-text-secondary flex flex-col items-center gap-1">
        <span>Software de Pedidos y Gestión para Locales Gastronómicos</span>
        <span className="font-semibold text-text">Potenciado por CMOR FLOW</span>
      </footer>
    </div>
  );
};

export default RestaurantDashboard;
