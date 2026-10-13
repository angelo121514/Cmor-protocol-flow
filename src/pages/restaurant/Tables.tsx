import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, QrCode, Copy, RefreshCw, Check, UserCheck } from "lucide-react";
import { Card, Button, Input, Select, Modal, Loading, Alert } from "../../components/ui";
import { useRestaurantId } from "../../hooks/useAuth";
import { formatCurrency } from "../../utils/helpers";
import { getTables, createTable, updateTable, deleteTable, regenerateQrToken, getTableSessions, buildTableQrUrl } from "../../services/tableService";
import { getWaiters } from "../../services/waiterService";
import type { RestaurantTable, TableSession, Waiter } from "../../config/supabase";
import type { TableInput } from "../../services/tableService";

type Status = { type: "success" | "error" | null; message: string };

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  available: { label: "Disponible", color: "bg-green-100 text-green-700" },
  occupied: { label: "Ocupada", color: "bg-blue-100 text-blue-700" },
  reserved: { label: "Reservada", color: "bg-amber-100 text-amber-700" },
  cleaning: { label: "Limpieza", color: "bg-gray-100 text-gray-700" },
};

const SESSION_BADGE: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "bg-green-100 text-green-700" },
  payment_pending: { label: "Pago en curso", color: "bg-amber-100 text-amber-700" },
  closed: { label: "Cerrada", color: "bg-gray-100 text-gray-700" },
};

const Tables: React.FC = () => {
  const restaurantId = useRestaurantId();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>({ type: null, message: "" });

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    table_number: "",
    capacity: 4,
    assigned_waiter_id: "" as string,
  });
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<RestaurantTable | null>(null);

  // Carga de mesas, sesiones y meseros activos
  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [tablesRes, sessRes, waitersRes] = await Promise.all([
      getTables(restaurantId),
      getTableSessions(restaurantId),
      getWaiters(restaurantId),
    ]);
    if (tablesRes.error || sessRes.error) {
      setStatus({
        type: "error",
        message:
          tablesRes.error?.message ||
          sessRes.error?.message ||
          "Error al cargar las mesas.",
      });
    } else {
      setTables(tablesRes.data ?? []);
      setSessions(sessRes.data ?? []);
    }
    if (waitersRes.data) {
      setWaiters(waitersRes.data.filter((w) => w.is_active));
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    const fetchData = async () => {
      const [tablesRes, sessRes, waitersRes] = await Promise.all([
        getTables(restaurantId),
        getTableSessions(restaurantId),
        getWaiters(restaurantId),
      ]);
      if (cancelled) return;
      if (tablesRes.error || sessRes.error) {
        setStatus({
          type: "error",
          message:
            tablesRes.error?.message ||
            sessRes.error?.message ||
            "Error al cargar las mesas.",
        });
      } else {
        setTables(tablesRes.data ?? []);
        setSessions(sessRes.data ?? []);
      }
      if (waitersRes.data) {
        setWaiters(waitersRes.data.filter((w) => w.is_active));
      }
      setLoading(false);
    };
    fetchData();
    const id = setInterval(fetchData, 30000); // refrescar estado de sesiones
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [restaurantId]);

  const handleCreate = async () => {
    if (!restaurantId || !createForm.table_number.trim()) return;
    setCreating(true);
    const input: TableInput = {
      restaurant_id: restaurantId,
      table_number: createForm.table_number.trim(),
      capacity: Number(createForm.capacity) || 4,
    };
    const { data, error } = await createTable(input);
    setCreating(false);
    if (error || !data) {
      setStatus({
        type: "error",
        message: error?.message || "No se pudo crear la mesa.",
      });
      return;
    }
    // Si se asignó un mesero, actualizar la mesa recién creada
    if (createForm.assigned_waiter_id && data.id) {
      await updateTable(data.id, {
        assigned_waiter_id: createForm.assigned_waiter_id,
      } as unknown as Parameters<typeof updateTable>[1]);
    }
    setCreateForm({ table_number: "", capacity: 4, assigned_waiter_id: "" });
    setShowCreate(false);
    setStatus({
      type: "success",
      message: `Mesa "${data.table_number}" creada.`,
    });
    load();
  };

  const handleAssignWaiter = async (
    tableId: string,
    waiterId: string | null
  ) => {
    const { error } = await updateTable(tableId, {
      assigned_waiter_id: waiterId ?? undefined,
    } as unknown as Parameters<typeof updateTable>[1]);
    if (error) {
      setStatus({
        type: "error",
        message: error.message,
      });
      return;
    }
    load();
  };

  const handleDelete = async (table: RestaurantTable) => {
    if (
      !confirm(
        `¿Eliminar la mesa "${table.table_number}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    const { error } = await deleteTable(table.id);
    if (error) {
      setStatus({ type: "error", message: error.message });
      return;
    }
    setStatus({ type: "success", message: "Mesa eliminada." });
    load();
  };

  const handleRegenerate = async (table: RestaurantTable) => {
    if (!confirm("Regenerar el QR invalidará el código anterior. ¿Continuar?"))
      return;
    const { data, error } = await regenerateQrToken(table.id);
    if (error || !data) {
      setStatus({
        type: "error",
        message: error?.message || "No se pudo regenerar el QR.",
      });
      return;
    }
    setQrModal(data);
    setStatus({
      type: "success",
      message: "QR regenerado. Imprime el nuevo código.",
    });
    load();
  };

  const copyUrl = async (table: RestaurantTable) => {
    try {
      await navigator.clipboard.writeText(buildTableQrUrl(table.qr_token));
      setCopiedId(table.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setStatus({
        type: "error",
        message: "No se pudo copiar al portapapeles.",
      });
    }
  };

  const activeSessionFor = (tableId: string) =>
    sessions.find((s) => s.table_id === tableId && s.status !== "closed");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading />
      </div>
    );
  }

  const waiterOptions = [
    { value: "", label: "Sin asignar" },
    ...waiters.map((w) => ({ value: w.id, label: w.name })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Mesas y QR</h1>
          <p className="text-text-secondary text-sm mt-1">
            Genera un QR por mesa para que los clientes pidan y paguen desde su
            móvil. Asigna un mesero responsable a cada mesa.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Nueva mesa
        </Button>
      </div>

      {status.type && (
        <Alert
          type={status.type === "error" ? "error" : "success"}
          message={status.message}
          onClose={() => setStatus({ type: null, message: "" })}
        />
      )}

      {tables.length === 0 ? (
        <Card className="p-12 text-center">
          <QrCode className="w-12 h-12 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary">
            Aún no hay mesas. Crea la primera para empezar a recibir pedidos
            por QR.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => {
            const sess = activeSessionFor(table.id);
            const badge =
              STATUS_BADGE[table.status] ?? STATUS_BADGE.available;
            return (
              <Card key={table.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-text text-lg">
                      {table.table_number}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      Capacidad: {table.capacity} personas
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Mesero asignado */}
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <Select
                    value={table.assigned_waiter_id ?? ""}
                    onChange={(e) =>
                      handleAssignWaiter(
                        table.id,
                        e.target.value || null
                      )
                    }
                    options={waiterOptions}
                    className="text-xs py-1"
                  />
                </div>

                {sess && (
                  <div className="bg-bg-subtle rounded-lg p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary text-xs">
                        Sesión activa
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          (
                            SESSION_BADGE[sess.status] ??
                            SESSION_BADGE.active
                          ).color
                        }`}
                      >
                        {
                          (
                            SESSION_BADGE[sess.status] ??
                            SESSION_BADGE.active
                          ).label
                        }
                      </span>
                    </div>
                    <p className="font-bold text-accent">
                      {formatCurrency(sess.total_amount)}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQrModal(table)}
                  >
                    <QrCode className="w-3.5 h-3.5" /> Ver QR
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyUrl(table)}
                    title="Copiar URL del QR"
                  >
                    {copiedId === table.id ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRegenerate(table)}
                    title="Regenerar QR"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(table)}
                    title="Eliminar mesa"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-error" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal crear mesa */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nueva mesa"
        size="sm"
      >
        <div className="space-y-3">
          <Input
            label="Identificador de la mesa"
            value={createForm.table_number}
            onChange={(e) =>
              setCreateForm({ ...createForm, table_number: e.target.value })
            }
            placeholder="Ej: Mesa 1, Terraza 2, Barra"
          />
          <Input
            label="Capacidad (personas)"
            type="number"
            min={1}
            value={String(createForm.capacity)}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                capacity: Number(e.target.value),
              })
            }
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Mesero asignado
            </label>
            <Select
              value={createForm.assigned_waiter_id}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  assigned_waiter_id: e.target.value,
                })
              }
              options={waiterOptions}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !createForm.table_number.trim()}
            >
              {creating ? "Creando…" : "Crear mesa"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal QR */}
      <Modal
        isOpen={!!qrModal}
        onClose={() => setQrModal(null)}
        title={`QR · ${qrModal?.table_number ?? ""}`}
        size="sm"
      >
        {qrModal && (
          <div className="text-center space-y-3">
            <div className="bg-white p-4 rounded-lg inline-block">
              {/* QR renderizado por servicio externo basado en el contenido de la URL. */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                  buildTableQrUrl(qrModal.qr_token)
                )}`}
                alt={`QR ${qrModal.table_number}`}
                width={240}
                height={240}
              />
            </div>
            <p className="text-sm text-text-secondary break-all">
              {buildTableQrUrl(qrModal.qr_token)}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => copyUrl(qrModal)}>
                <Copy className="w-4 h-4" /> Copiar URL
              </Button>
              <Button onClick={() => setQrModal(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Tables;
