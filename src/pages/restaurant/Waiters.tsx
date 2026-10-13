import React, { useEffect, useState, useCallback } from "react";
import { Plus, Edit, UserCheck, Clock, TrendingUp } from "lucide-react";
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Loading,
  Alert,
  Select,
  Tabs,
} from "../../components/ui";
import type { TabItem } from "../../components/ui";
import { useRestaurantId } from "../../hooks/useAuth";
import { formatCurrency } from "../../utils/helpers";
import type {
  Waiter,
  WaiterRole,
  WaiterSession,
  RestaurantTable,
} from "../../config/supabase";
import {
  getWaiters,
  createWaiter,
  updateWaiter,
  deactivateWaiter,
  getActiveSessions,
  getSessionHistory,
  endSession,
} from "../../services/waiterService";
import { getTables } from "../../services/tableService";

const ROLES: { value: WaiterRole; label: string }[] = [
  { value: "waiter", label: "Mesero" },
  { value: "bartender", label: "Bartender" },
  { value: "host", label: "Host" },
  { value: "cashier", label: "Cajero" },
];

const ROLE_LABELS: Record<WaiterRole, string> = {
  waiter: "Mesero",
  bartender: "Bartender",
  host: "Host",
  cashier: "Cajero",
};

type Status = { type: "success" | "error" | null; message: string };

const Waiters: React.FC = () => {
  const restaurantId = useRestaurantId();
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeSessions, setActiveSessions] = useState<
    (WaiterSession & { waiters: { name: string; role: WaiterRole } | null })[]
  >([]);
  const [history, setHistory] = useState<
    (WaiterSession & { waiters: { name: string; role: WaiterRole } | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>({ type: null, message: "" });

  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Waiter | null>(null);
  const [form, setForm] = useState({
    name: "",
    pin: "",
    role: "waiter" as WaiterRole,
    phone: "",
  });

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    const [w, s, h, t] = await Promise.all([
      getWaiters(restaurantId),
      getActiveSessions(restaurantId),
      getSessionHistory(restaurantId),
      getTables(restaurantId),
    ]);
    setWaiters(w.data ?? []);
    setActiveSessions(s.data ?? []);
    setHistory(h.data ?? []);
    setTables(t.data ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    Promise.all([
      getWaiters(restaurantId),
      getActiveSessions(restaurantId),
      getSessionHistory(restaurantId),
      getTables(restaurantId),
    ]).then(([w, s, h, t]) => {
      if (cancelled) return;
      setWaiters(w.data ?? []);
      setActiveSessions(s.data ?? []);
      setHistory(h.data ?? []);
      setTables(t.data ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  // Helper: obtener mesas asignadas a un mesero
  const getTablesForWaiter = (waiterId: string): RestaurantTable[] => {
    return tables.filter((t) => t.assigned_waiter_id === waiterId);
  };

  const handleSave = async () => {
    if (!restaurantId || !form.name.trim()) {
      setStatus({ type: "error", message: "El nombre es obligatorio" });
      return;
    }
    if (!editing && form.pin.length < 4) {
      setStatus({
        type: "error",
        message: "El PIN debe tener al menos 4 dígitos",
      });
      return;
    }
    setStatus({ type: null, message: "" });

    if (editing) {
      // Editar: el PIN solo se actualiza si se ingresa uno nuevo
      const updates: { name?: string; pin?: string; role?: WaiterRole } = {
        name: form.name.trim(),
        role: form.role,
      };
      if (form.pin.length >= 4) updates.pin = form.pin;
      const { error } = await updateWaiter(editing.id, updates);
      if (error) {
        setStatus({ type: "error", message: error.message });
        return;
      }
      setStatus({ type: "success", message: "Mesero actualizado" });
    } else {
      const { error } = await createWaiter({
        restaurant_id: restaurantId,
        name: form.name.trim(),
        pin: form.pin,
        role: form.role,
      });
      if (error) {
        setStatus({ type: "error", message: error.message });
        return;
      }
      setStatus({ type: "success", message: "Mesero creado" });
    }
    setShowModal(false);
    setEditing(null);
    await loadData();
  };

  const handleDeactivate = async (waiter: Waiter) => {
    if (!window.confirm(`¿Desactivar a ${waiter.name}?`)) return;
    const { error } = await deactivateWaiter(waiter.id);
    if (error) {
      setStatus({ type: "error", message: error.message });
      return;
    }
    setStatus({ type: "success", message: "Mesero desactivado" });
    await loadData();
  };

  const handleEndSession = async (sessionId: string) => {
    const { error } = await endSession(sessionId);
    if (error) {
      setStatus({ type: "error", message: error.message });
      return;
    }
    setStatus({ type: "success", message: "Turno cerrado" });
    await loadData();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", pin: "", role: "waiter", phone: "" });
    setShowModal(true);
  };

  const openEdit = (w: Waiter) => {
    setEditing(w);
    setForm({ name: w.name, pin: "", role: w.role, phone: w.phone ?? "" });
    setShowModal(true);
  };

  if (loading) return <Loading text="Cargando meseros..." />;

  const equipoTab: TabItem = {
    key: "team",
    label: "Equipo",
    content: (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Nuevo mesero
          </Button>
        </div>
        {waiters.length === 0 ? (
          <Card className="p-8 text-center text-text-secondary">
            <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No hay meseros. Crea el primero.
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {waiters.map((w) => {
              const assignedTables = getTablesForWaiter(w.id);
              return (
                <Card key={w.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text">
                          {w.name}
                        </span>
                        <Badge className="bg-accent/10 text-accent border border-accent/20">
                          {ROLE_LABELS[w.role]}
                        </Badge>
                        {!w.is_active && (
                          <Badge className="bg-bg-subtle text-text-secondary">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      {w.phone && (
                        <div className="text-sm text-text-secondary mt-1">
                          {w.phone}
                        </div>
                      )}
                      {/* Mesas asignadas */}
                      {assignedTables.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <UserCheck className="w-3 h-3 text-accent" />
                          {assignedTables.map((t) => (
                            <Badge
                              key={t.id}
                              className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.5"
                            >
                              {t.table_number}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Edit className="w-4 h-4" />}
                        onClick={() => openEdit(w)}
                      />
                      {w.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(w)}
                        >
                          Desactivar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    ),
  };

  const turnosTab: TabItem = {
    key: "active",
    label: `Turnos activos${activeSessions.length > 0 ? ` (${activeSessions.length})` : ""}`,
    content: (
      <div className="space-y-3">
        {activeSessions.length === 0 ? (
          <Card className="p-8 text-center text-text-secondary">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No hay turnos activos.
          </Card>
        ) : (
          activeSessions.map((s) => {
            const assignedTables = s.waiter_id
              ? tables.filter(
                  (t) => t.assigned_waiter_id === s.waiter_id
                )
              : [];
            return (
              <Card
                key={s.id}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-text">
                    {s.waiters?.name ?? "Mesero"}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {ROLE_LABELS[s.waiters?.role ?? "waiter"]} · Inició{" "}
                    {new Date(s.started_at).toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {/* Mesas asignadas al mesero en turno */}
                  {assignedTables.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <UserCheck className="w-3 h-3 text-accent" />
                      {assignedTables.map((t) => (
                        <Badge
                          key={t.id}
                          className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.5"
                        >
                          {t.table_number}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="text-text-secondary">
                      {s.orders_count} pedidos
                    </div>
                    <div className="text-text font-medium">
                      {formatCurrency(s.total_sales)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEndSession(s.id)}
                  >
                    Cerrar turno
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    ),
  };

  const historialTab: TabItem = {
    key: "history",
    label: "Historial",
    content: (
      <div className="space-y-3">
        {history.length === 0 ? (
          <Card className="p-8 text-center text-text-secondary">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No hay sesiones anteriores.
          </Card>
        ) : (
          history.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-text">
                  {s.waiters?.name ?? "Mesero"}
                </div>
                <div className="text-sm text-text-secondary">
                  {new Date(s.started_at).toLocaleDateString("es-CL")} ·{" "}
                  {new Date(s.started_at).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  →{" "}
                  {s.ended_at
                    ? new Date(s.ended_at).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-text-secondary">
                  {s.orders_count} pedidos
                </div>
                <div className="text-text font-medium">
                  {formatCurrency(s.total_sales)}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Meseros</h1>
        <p className="text-text-secondary text-sm mt-1">
          Gestiona tu equipo, turnos, sesiones activas y mesas asignadas.
        </p>
      </div>

      {status.type && (
        <Alert
          type={status.type === "error" ? "error" : "success"}
          message={status.message}
        />
      )}

      <Tabs
        tabs={[equipoTab, turnosTab, historialTab]}
        defaultActiveKey="team"
      />

      {/* Modal crear/editar */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Editar mesero" : "Nuevo mesero"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Nombre *
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Rol
            </label>
            <Select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as WaiterRole })
              }
              options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              PIN {editing ? "(dejar vacío para mantener)" : "*"}
            </label>
            <Input
              type="password"
              value={form.pin}
              onChange={(e) =>
                setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })
              }
              placeholder="4-6 dígitos"
              maxLength={6}
            />
            <p className="text-xs text-text-secondary mt-1">
              El PIN se guarda hasheado (bcrypt). Nunca se almacena en texto
              plano.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Waiters;
