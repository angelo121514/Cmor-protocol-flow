import React, { useEffect, useState } from "react";
import {
  ShoppingBag,
  UtensilsCrossed,
  DollarSign,
  Clock,
  Users,
  Package,
  Wallet,
  Bell,
  CheckCircle,
  XCircle,
  Info,
  QrCode,
  Landmark,
} from "lucide-react";
import { Card, Loading } from "../../components/ui";
import { getRestaurantStats } from "../../services/restaurantService";
import {
  getDashboardStats,
  getUnreadNotifications,
  markAllNotificationsRead,
  timeAgo,
  tableOccupancy,
  formatTips,
} from "../../services/dashboardService";
import type { DashboardStats } from "../../services/dashboardService";
import { formatCurrency } from "../../utils/helpers";
import { useRestaurantId, useAuth } from "../../hooks/useAuth";

type RestaurantStats = Awaited<ReturnType<typeof getRestaurantStats>>;

/** Mapea tipo de notificación → componente ícono. */
const NotifIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case "low_stock": return <Package className="w-4 h-4 text-warning" />;
    case "order_new": return <ShoppingBag className="w-4 h-4 text-accent" />;
    case "order_completed": return <CheckCircle className="w-4 h-4 text-success" />;
    case "order_cancelled": return <XCircle className="w-4 h-4 text-error" />;
    case "shift_opened":
    case "shift_closed": return <Wallet className="w-4 h-4 text-accent-secondary" />;
    default: return <Info className="w-4 h-4 text-text-secondary" />;
  }
};

const RestaurantHome: React.FC = () => {
  const restaurantId = useRestaurantId();
  const { restaurant } = useAuth();
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Awaited<ReturnType<typeof getUnreadNotifications>>["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifs, setShowNotifs] = useState(false);
  const [loadError,setLoadError]=useState("");

  // El setState va dentro de la función async (no en el cuerpo síncrono del
  // efecto), mismo patrón que Tables.tsx para evitar react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!restaurantId) return;
    let cancelled=false;
    const fetchData = async () => {
     try {
      const [basicStats, dashRes, notifRes] = await Promise.all([
        getRestaurantStats(restaurantId),
        getDashboardStats(restaurantId),
        getUnreadNotifications(restaurantId),
      ]);
      if(cancelled)return;
      if(dashRes.error || notifRes.error)throw new Error("dashboard_failed");
      setLoadError("");setStats(basicStats);
      if (dashRes.data) setDashboardStats(dashRes.data);
      if (!notifRes.error) setNotifications(notifRes.data);
      setLoading(false);
     } catch {if(!cancelled){setLoadError("No se pudo cargar el resumen. Las cifras no están disponibles.");setLoading(false);}}
    };
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => {cancelled=true;clearInterval(id);};
  }, [restaurantId]);

  const handleMarkRead = async () => {
    if (!restaurantId) return;
    await markAllNotificationsRead(restaurantId);
    setNotifications([]);
  };

  if (loading && restaurantId) {
    return <Loading text="Cargando resumen del panel..." />;
  }

  if(loadError)return <div role="alert" className="p-6">{loadError}</div>;
  const unreadCount = notifications.length;

  // ---- Stat cards principales ----
  const statCards = [
    {
      title: "Pedidos Pendientes",
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Pedidos de Hoy",
      value: stats?.completedToday || 0,
      icon: ShoppingBag,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Ingresos de Hoy",
      value: formatCurrency(stats?.revenueToday || 0),
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Pedidos Históricos",
      value: stats?.totalOrders || 0,
      icon: UtensilsCrossed,
      color: "text-accent-secondary",
      bgColor: "bg-accent-secondary/10",
    },
  ];

  // ---- Widgets operativos ----
  const widgets = [
    {
      title: "Mesas Ocupadas",
      value: dashboardStats
        ? `${dashboardStats.occupiedTables}/${dashboardStats.totalTables}`
        : "—",
      subtitle: dashboardStats
        ? `${tableOccupancy(dashboardStats.occupiedTables, dashboardStats.totalTables)}% ocupación`
        : "",
      icon: QrCode,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Meseros Activos",
      value: dashboardStats ? String(dashboardStats.activeWaiters) : "—",
      subtitle: "",
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Inventario Bajo Stock",
      value: dashboardStats ? String(dashboardStats.lowStockCount) : "—",
      subtitle: dashboardStats?.lowStockCount
        ? "Revisar items críticos"
        : "Todo OK",
      icon: Package,
      color: dashboardStats && dashboardStats.lowStockCount > 0
        ? "text-warning"
        : "text-success",
      bgColor: dashboardStats && dashboardStats.lowStockCount > 0
        ? "bg-warning/10"
        : "bg-success/10",
    },
    {
      title: "Propinas de Hoy",
      value: dashboardStats ? formatTips(dashboardStats.tipsToday, restaurant?.currency || "CLP") : "—",
      subtitle: "",
      icon: Wallet,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Estado de Caja",
      value: dashboardStats
        ? dashboardStats.shiftOpen ? "Abierta" : "Cerrada"
        : "—",
      subtitle: dashboardStats?.shiftOpen ? "Turno en curso" : "Sin turno activo",
      icon: Wallet,
      color: dashboardStats?.shiftOpen ? "text-success" : "text-text-secondary",
      bgColor: dashboardStats?.shiftOpen ? "bg-success/10" : "bg-bg-subtle",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Panel de Control</h2>
          <p className="text-text-secondary">
            ¡Hola de nuevo! Aquí tienes un resumen general de tu local.
          </p>
        </div>
        {/* Notificaciones bell + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg border border-border hover:border-accent transition-colors"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-error text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-bg border border-border rounded-xl shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h4 className="text-sm font-semibold text-text">Notificaciones</h4>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkRead}
                    className="text-xs text-accent hover:underline"
                  >
                    Marcar todas leídas
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-text-secondary text-sm p-4 text-center">
                    Sin notificaciones pendientes
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-bg-subtle border-b border-border last:border-b-0"
                    >
                      <div className="mt-0.5"><NotifIcon type={n.type} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-text-secondary truncate">{n.message}</p>
                        )}
                        <p className="text-[10px] text-text-secondary mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Widgets operativos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {widgets.map((w, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className={`${w.bgColor} p-2 rounded-lg`}>
                <w.icon className={`w-4 h-4 ${w.color}`} />
              </div>
            </div>
            <p className="text-lg font-bold text-text">{w.value}</p>
            <p className="text-text-secondary text-xs">{w.title}</p>
            {w.subtitle && (
              <p className={`text-xs mt-1 ${w.color}`}>{w.subtitle}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-text mb-4">Acciones Rápidas</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <a
            href="/restaurant/orders"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <ShoppingBag className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Ver Pedidos</p>
            <p className="text-sm text-text-secondary">
              Gestiona órdenes en cocina
            </p>
          </a>
          <a
            href="/restaurant/menu"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <UtensilsCrossed className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Administrar Menú</p>
            <p className="text-sm text-text-secondary">Actualiza platos y precios</p>
          </a>
          <a
            href="/restaurant/reports"
            className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <DollarSign className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-text">Ver Reportes</p>
            <p className="text-sm text-text-secondary">Ventas e informes</p>
          </a>
          {restaurant?.country === "CL" && (
            <a
              href="/restaurant/accounting"
              className="p-4 border border-border rounded-lg hover:border-accent hover:bg-accent/5 transition-colors text-center"
            >
              <Landmark className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="font-medium text-text">Contabilidad</p>
              <p className="text-sm text-text-secondary">Boletas y facturas SII</p>
            </a>
          )}
        </div>
      </Card>
    </div>
  );
};

export default RestaurantHome;
