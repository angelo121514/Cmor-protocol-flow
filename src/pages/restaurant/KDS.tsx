import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  ChefHat,
  BellRing,
  ArrowRight,
} from "lucide-react";
import { Button, Loading } from "../../components/ui";
import { subscribeToOrders, updateOrderStatus } from "../../services/restaurantService";
import { partitionOrders, minutesSinceAccepted } from "../../services/kdsService";
import { formatCurrency } from "../../utils/helpers";
import { useAuth } from "../../hooks/useAuth";
import type { Order } from "../../config/supabase";

// Columnas del tablero KDS. Cada una define qué pedidos muestra y cuál es la
// siguiente transición disponible para el botón principal de cada tarjeta.
interface ColumnDef {
  key: keyof ReturnType<typeof partitionOrders>;
  title: string;
  icon: React.ReactNode;
  headerClass: string;
  nextStatus?: Order["status"];
  nextLabel?: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: "pending",
    title: "Nuevos",
    icon: <Clock className="w-5 h-5" />,
    headerClass: "bg-warning/10 text-warning border-warning/30",
    nextStatus: "accepted",
    nextLabel: "Aceptar",
  },
  {
    key: "accepted",
    title: "Aceptados",
    icon: <CheckCircle className="w-5 h-5" />,
    headerClass: "bg-accent-secondary/10 text-accent-secondary border-accent-secondary/30",
    nextStatus: "preparing",
    nextLabel: "Empezar",
  },
  {
    key: "preparing",
    title: "En Preparación",
    icon: <ChefHat className="w-5 h-5" />,
    headerClass: "bg-accent-secondary/10 text-accent-secondary border-accent-secondary/30",
    nextStatus: "ready",
    nextLabel: "Listo",
  },
  {
    key: "ready",
    title: "Listos",
    icon: <BellRing className="w-5 h-5" />,
    headerClass: "bg-success/10 text-success border-success/30",
    nextStatus: "completed",
    nextLabel: "Entregar",
  },
];

const KDS: React.FC = () => {
  const { restaurant } = useAuth();
  const restaurantId = restaurant?.id || null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Reloj interno: fuerza re-render cada 30s para refrescar los minutos
  // transcurridos de cada tarjeta sin depender de nuevos eventos.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    const subscription = subscribeToOrders(restaurantId, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => {
      // unsubscribe() del wrapper ya elimina el canal (removeChannel).
      subscription.unsubscribe();
    };
  }, [restaurantId]);

  const columns = useMemo(() => partitionOrders(orders), [orders]);
  const activeCount = orders.filter((o) =>
    ["pending", "accepted", "preparing", "ready"].includes(o.status)
  ).length;

  const handleAdvance = async (order: Order, nextStatus: Order["status"]) => {
    if (processingIds.has(order.id)) return;
    setProcessingIds((prev) => new Set(prev).add(order.id));
    const previousOrders = [...orders];
    // Update optimista.
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? ({ ...o, status: nextStatus } as Order) : o
      )
    );
    const success = await updateOrderStatus(order.id, nextStatus);
    if (!success) {
      setOrders(previousOrders);
    }
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(order.id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading text="Cargando cocina…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-text">Monitor de Cocina (KDS)</h1>
          <p className="text-text-secondary text-sm">
            {activeCount} pedido{activeCount === 1 ? "" : "s"} activo
            {activeCount === 1 ? "" : "s"} · actualización en tiempo real
          </p>
        </div>
        <Link to="/restaurant/orders">
          <Button variant="ghost" size="sm">
            <ArrowRight className="w-4 h-4" /> Ir a Pedidos
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = columns[col.key];
          return (
            <div key={col.key} className="flex flex-col gap-3 min-w-0">
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${col.headerClass}`}
              >
                <span className="flex items-center gap-2 font-bold">
                  {col.icon}
                  {col.title}
                </span>
                <span className="text-sm font-bold bg-white/50 rounded-full w-6 h-6 flex items-center justify-center">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {colOrders.length === 0 ? (
                  <p className="text-text-secondary text-xs text-center py-8 border border-dashed border-border rounded-lg">
                    Sin pedidos
                  </p>
                ) : (
                  colOrders.map((order) => (
                    <KdsTicket
                      key={order.id}
                      order={order}
                      column={col}
                      processing={processingIds.has(order.id)}
                      onAdvance={() =>
                        col.nextStatus && handleAdvance(order, col.nextStatus)
                      }
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Ticket individual
// ---------------------------------------------------------------------------
interface KdsTicketProps {
  order: Order;
  column: ColumnDef;
  processing: boolean;
  onAdvance: () => void;
}

const KdsTicket: React.FC<KdsTicketProps> = ({ order, column, processing, onAdvance }) => {
  const minutes = minutesSinceAccepted(order);
  const isLate = minutes > (order.accepted_at ? 15 : 0) && column.key !== "ready";

  return (
    <div
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
          <li key={idx} className="flex justify-between gap-2">
            <span className="font-medium text-text">
              {item.quantity}× {item.name}
            </span>
          </li>
        ))}
      </ul>

      {order.customer_notes && (
        <p className="text-xs text-warning bg-warning/10 rounded p-1.5">
          ⚠ {order.customer_notes}
        </p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <span className="text-xs text-text-secondary">
          {formatCurrency(order.total)}
        </span>
        {column.nextStatus && (
          <Button
            size="sm"
            onClick={onAdvance}
            disabled={processing || (column.key === "ready" && order.payment_status !== "paid")}
            title={column.key === "ready" && order.payment_status !== "paid" ? "Registra el pago antes de entregar" : undefined}
          >
            {column.key === "ready" && order.payment_status !== "paid"
              ? "Pago pendiente"
              : column.nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default KDS;
