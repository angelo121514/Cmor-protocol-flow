import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Wallet,
  PlayCircle,
  StopCircle,
  TrendingUp,
  Banknote,
  CreditCard,
  Landmark,
  QrCode,
  Users,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Loader2,
} from "lucide-react";
import { Tabs } from "../../components/ui";
import { Modal, Button, Card, Input } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { formatCurrency } from "../../utils/helpers";
import {
  openShift,
  getActiveShift,
  getShiftHistory,
  closeShift,
  getShiftMetrics,
  type ShiftMetrics,
  expectedCash,
  cashDifference,
  formatDifference,
} from "../../services/cashShiftService";
import type { CashShift as CashShiftRow } from "../../config/supabase";
import { supabase } from "../../config/supabase";

// ---------------------------------------------------------------------------
// Cierre de Turno / Caja — Fase 7
// ---------------------------------------------------------------------------
// - Tab "Turno actual": abrir caja (fondo inicial) o, si hay turno abierto,
//   ventas en vivo (polling 30s de la RPC cash_shift_metrics) + botón "Cerrar turno" que abre
//   un modal de cierre (conteo real de efectivo → diferencia cuadrada).
// - Tab "Historial": cierres pasados con botón "Imprimir" que abre el
//   comprobante imprimible (createPortal + window.print, mismo patrón que POS).
//
// Los totales autoritativos del cierre los calcula la RPC close_cash_shift
// server-side. cash_shift_metrics comparte la agregación autoritativa con el cierre.
// ---------------------------------------------------------------------------

function useCashFormat() {
  const { restaurant } = useAuth();
  return (amount: number | undefined | null) => formatCurrency(amount, restaurant?.currency || "CLP");
}

const CashShift: React.FC = () => {
  const { restaurant } = useAuth();
  const restaurantId = restaurant?.id || null;

  const [active, setActive] = useState<CashShiftRow | null>(null);
  const [history, setHistory] = useState<CashShiftRow[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<(ShiftMetrics & { shiftId: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Cargar turno activo + historial ----
  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    const [activeRes, histRes] = await Promise.all([
      getActiveShift(restaurantId),
      getShiftHistory(restaurantId),
    ]);
    if (activeRes.error) setError(activeRes.error.message);
    setActive(activeRes.data);
    if (histRes.error) setError(histRes.error.message);
    setHistory(histRes.data ?? []);
    setLoading(false);
  }, [restaurantId]);

  // Carga inicial del turno + historial. El setState va dentro de la función
  // async (no en el cuerpo síncrono del efecto), mismo patrón que Tables.tsx.
  useEffect(() => {
    if (!restaurantId) return;
    const fetchData = async () => {
      const [activeRes, histRes] = await Promise.all([
        getActiveShift(restaurantId),
        getShiftHistory(restaurantId),
      ]);
      if (activeRes.error) setError(activeRes.error.message);
      setActive(activeRes.data);
      if (histRes.error) setError(histRes.error.message);
      setHistory(histRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [restaurantId]);

  // ---- Ventas en vivo del turno activo (polling 30s) ----
  // Solo corre cuando hay un turno activo. el resumen se distingue al cambiar de
  // turno vía la key del efecto (cleanup), no con un setState sincrónico.
  useEffect(() => {
    if (!restaurantId || !active) return;
    let cancelled = false;
    const fetchOrders = async () => {
      const result = await getShiftMetrics(active.id);
      if (cancelled) return;
      if (result.error || !result.data) { setError(result.error?.message || "Resumen de caja no disponible"); return; }
      setLiveMetrics({ ...result.data, shiftId: active.id });
      setError(null);
    };
    fetchOrders();
    const id = setInterval(fetchOrders, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [restaurantId, active]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-secondary">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando caja…
      </div>
    );
  }

  // Si no hay turno activo, ignorar órdenes stale (sin setState en el render).
  const live = active && liveMetrics?.shiftId === active.id ? liveMetrics : { cash: 0, card: 0, transfer: 0, qr: 0, total: 0, count: 0, total_tips: 0, cash_tips: 0, card_tips: 0, waiter_summary: [] };

  const tabs = [
    {
      key: "current",
      label: active ? "Turno abierto" : "Abrir turno",
      content: (
        <CurrentShiftTab
          restaurantId={restaurantId}
          active={active}
          live={live}
          restaurantName={restaurant?.name}
          error={error}
          onOpened={refresh}
          onClosed={refresh}
        />
      ),
    },
    {
      key: "history",
      label: "Historial",
      content: <HistoryTab history={history} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="w-7 h-7 text-accent" />
        <div>
          <h1 className="text-2xl font-bold text-text">Cierre de Caja</h1>
          <p className="text-sm text-text-secondary">
            Abre y cierra turnos, cuadra el efectivo y genera el reporte del día.
          </p>
        </div>
      </div>

      <Tabs tabs={tabs} defaultActiveKey="current" />
    </div>
  );
};

export default CashShift;

// =========================================================================
// Tab: Turno actual
// =========================================================================

interface CurrentProps {
  restaurantId: string | null;
  active: CashShiftRow | null;
  live: ShiftMetrics;
  restaurantName?: string;
  error: string | null;
  onOpened: () => void;
  onClosed: () => void;
}

const CurrentShiftTab: React.FC<CurrentProps> = ({
  restaurantId,
  active,
  live,
  restaurantName,
  error,
  onOpened,
  onClosed,
}) => {
  const fmt = useCashFormat();
  const [opening, setOpening] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [waiters, setWaiters] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const displayError = errorLocal ?? error;

  // Cargar trabajadores activos para el selector de responsable
  useEffect(() => {
    if (!restaurantId) return;
    supabase
      .from("waiters")
      .select("id, name")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data }) => setWaiters(data ?? []));
  }, [restaurantId]);

  const handleOpen = async () => {
    if (!restaurantId) return;
    setSubmitting(true);
    setErrorLocal(null);
    const amount = Number(opening) || 0;
    const { error } = await openShift(restaurantId, amount, undefined, responsibleId || undefined);
    setSubmitting(false);
    if (error) {
      setErrorLocal(error.message);
      return;
    }
    setOpening("");
    setResponsibleId("");
    onOpened();
  };

  if (!active) {
    return (
      <Card className="p-6 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <PlayCircle className="w-6 h-6 text-success" />
          <h2 className="text-lg font-semibold text-text">Abrir turno de caja</h2>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Registra el fondo inicial en efectivo y el trabajador responsable.
          Podrás cerrar el turno con el conteo real al final del día.
        </p>
        {displayError && (
          <p className="text-sm text-error mb-3">{displayError}</p>
        )}
        <label className="block text-sm font-medium text-text mb-1">
          Trabajador responsable <span className="text-error">*</span>
        </label>
        <select
          aria-label="Trabajador responsable"
          value={responsibleId}
          onChange={(e) => setResponsibleId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Seleccionar trabajador…</option>
          {waiters.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <label className="block text-sm font-medium text-text mb-1">
          Fondo inicial (efectivo)
        </label>
        <Input
          type="number"
          min="0"
          step="100"
          value={opening}
          aria-label="Fondo inicial (efectivo)"
          onChange={(e) => setOpening(e.target.value)}
          placeholder="0"
        />
        <Button
          className="mt-4 w-full"
          onClick={handleOpen}
          disabled={submitting || !opening || !responsibleId}
        >
          {submitting ? "Abriendo…" : "Abrir caja"}
        </Button>
      </Card>
    );
  }

  const liveExpected = expectedCash(active.opening_cash, live.cash, live.cash_tips);
  const openedAt = new Date(active.opened_at).toLocaleString("es-CL");
  const responsibleName = waiters.find((w) => w.id === active.responsible_waiter_id)?.name;

  return (
    <div className="space-y-4">
      {displayError && <p role="alert" className="text-sm text-error">{displayError}</p>}
      {/* Banner de turno abierto */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-success/10 border border-success/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
          <div>
            <p className="font-semibold text-text">Turno abierto</p>
            <p className="text-xs text-text-secondary">
              Desde {openedAt}
              {responsibleName && (
                <span className="text-text font-medium"> · Responsable: {responsibleName}</span>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="danger"
          disabled={Boolean(displayError)}
          onClick={() => setCloseModal(true)}
        >
          <StopCircle className="w-4 h-4 mr-2" /> Cerrar turno
        </Button>
      </div>

      {/* Fondo inicial */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Fondo inicial"
          value={fmt(active.opening_cash)}
          tint="bg-bg-subtle"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Ventas (vivo)"
          value={fmt(live.total)}
          tint="bg-accent/10 text-accent"
        />
        <StatCard
          icon={<Banknote className="w-5 h-5" />}
          label="Efectivo esp. (vivo)"
          value={fmt(liveExpected)}
          tint="bg-bg-subtle"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Pedidos (vivo)"
          value={String(live.count)}
          tint="bg-bg-subtle"
        />
      </div>

      {/* Desglose por método (preview en vivo) */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text mb-3">
          Ventas por método (en vivo)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MethodRow icon={<Banknote />} label="Efectivo" value={fmt(live.cash)} />
          <MethodRow icon={<CreditCard />} label="Tarjeta" value={fmt(live.card)} />
          <MethodRow icon={<Landmark />} label="Transferencia" value={fmt(live.transfer)} />
          <MethodRow icon={<QrCode />} label="QR" value={fmt(live.qr)} />
        </div>
        <p className="text-xs text-text-secondary mt-3">
          Preview calculado del turno abierto. Los totales finales se calculan
          al cerrar.
        </p>
      </Card>

      {closeModal && (
        <CloseShiftModal
          shift={active}
          liveCashSales={live.cash}
          liveCashTips={live.cash_tips}
          restaurantName={restaurantName}
          onClose={() => setCloseModal(false)}
          onClosed={() => {
            setCloseModal(false);
            onClosed();
          }}
        />
      )}
    </div>
  );
};

// =========================================================================
// Modal de cierre: conteo real → diferencia → confirmar
// =========================================================================

interface CloseProps {
  shift: CashShiftRow;
  liveCashSales: number;
  liveCashTips: number;
  restaurantName?: string;
  onClose: () => void;
  onClosed: () => void;
}

const CloseShiftModal: React.FC<CloseProps> = ({
  shift,
  liveCashSales,
  liveCashTips,
  restaurantName,
  onClose,
  onClosed,
}) => {
  const fmt = useCashFormat();
  const { restaurant } = useAuth();
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CashShiftRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El preview usa las ventas en vivo; el monto autoritativo lo calcula la RPC.
  const previewExpected = expectedCash(
    shift.opening_cash,
    liveCashSales,
    liveCashTips
  );
  const actualNum = Number(actual) || 0;
  const previewDiff = cashDifference(actualNum, previewExpected);

  const handleClose = async () => {
    setSubmitting(true);
    setError(null);
    const { data, error } = await closeShift(shift.id, actualNum, notes || undefined);
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResult(data);
  };

  // Tras cerrar: mostrar el comprobante imprimible del resultado.
  if (result) {
    return (
      <Modal isOpen onClose={onClosed} title="Turno cerrado" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-success">
            <CheckCircle2 className="w-6 h-6" />
            <p className="font-semibold">El turno se cerró correctamente.</p>
          </div>
          <CloseSummary shift={result} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClosed}>
              Cerrar
            </Button>
            <PrintReceiptButton
              shift={result}
              restaurantName={restaurantName}
            />
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Cerrar turno de caja" size="md">
      <div className="space-y-4">
        {error && <p className="text-sm text-error">{error}</p>}

        <div className="bg-bg-subtle rounded-lg p-3 text-sm space-y-1">
          <Row label="Fondo inicial" value={fmt(shift.opening_cash)} />
          <Row label="Efectivo vendido (vivo)" value={fmt(liveCashSales)} />
          <Row label="Propinas efectivo (vivo)" value={fmt(liveCashTips)} />
          <div className="border-t border-border my-2" />
          <Row
            label="Efectivo esperado"
            value={fmt(previewExpected)}
            strong
          />
        </div>

        <label className="block text-sm font-medium text-text">
          Conteo real de efectivo
        </label>
        <Input
          type="number"
          min="0"
          step="100"
          value={actual}
          aria-label="Conteo real de efectivo"
          onChange={(e) => setActual(e.target.value)}
          placeholder="0"
          autoFocus
        />

        {actual !== "" && (
          <div
            className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
              previewDiff === 0
                ? "bg-success/10 text-success"
                : previewDiff > 0
                ? "bg-amber-500/10 text-amber-600"
                : "bg-error/10 text-error"
            }`}
          >
            {previewDiff === 0 ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>Diferencia: {formatDifference(previewDiff, restaurant?.currency || "CLP")}</span>
          </div>
        )}

        <label className="block text-sm font-medium text-text">
          Notas (opcional)
        </label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones del cierre…"
        />

        <p className="text-xs text-text-secondary">
          Los totales finales por método y el resumen de propinas se calculan al
          confirmar.
        </p>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleClose}
            disabled={submitting || actual === ""}
          >
            {submitting ? "Cerrando…" : "Confirmar cierre"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// =========================================================================
// Resumen de un cierre (usado en el modal y en el comprobante)
// =========================================================================

const CloseSummary: React.FC<{
  shift: CashShiftRow;
}> = ({ shift }) => {
  const fmt = useCashFormat();
  const { restaurant } = useAuth();
  const diff = shift.cash_difference ?? 0;
  return (
    <div className="bg-bg-subtle rounded-lg p-4 text-sm space-y-1">
      <Row label="Ventas totales" value={fmt(shift.total_sales)} strong />
      <Row label="Efectivo" value={fmt(shift.cash_sales)} />
      <Row label="Tarjeta" value={fmt(shift.card_sales)} />
      <Row label="Transferencia" value={fmt(shift.transfer_sales)} />
      <Row label="QR" value={fmt(shift.qr_sales)} />
      <div className="border-t border-border my-2" />
      <Row label="Propinas totales" value={fmt(shift.total_tips)} />
      <Row label="Propinas efectivo" value={fmt(shift.cash_tips)} />
      <div className="border-t border-border my-2" />
      <Row label="Fondo inicial" value={fmt(shift.opening_cash)} />
      <Row label="Efectivo esperado" value={fmt(shift.expected_cash)} />
      <Row label="Efectivo contado" value={fmt(shift.actual_cash ?? 0)} />
      <Row
        label="Diferencia"
        value={formatDifference(diff, restaurant?.currency || "CLP")}
        strong
        tone={diff === 0 ? "ok" : diff > 0 ? "warn" : "err"}
      />
      {shift.waiter_summary?.length > 0 && (
        <>
          <div className="border-t border-border my-2" />
          <p className="font-semibold text-text mt-2">Propinas por mesero</p>
          {shift.waiter_summary.map((w) => (
            <Row
              key={w.waiter_id}
              label={w.name}
              value={fmt(w.tips)}
            />
          ))}
        </>
      )}
    </div>
  );
};

// =========================================================================
// Tab: Historial
// =========================================================================

const HistoryTab: React.FC<{
  history: CashShiftRow[];
}> = ({ history }) => {
  const fmt = useCashFormat();
  const { restaurant } = useAuth();
  const closed = history.filter((h) => h.status === "closed");

  if (closed.length === 0) {
    return (
      <Card className="p-8 text-center text-text-secondary">
        Aún no hay cierres registrados.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {closed.map((shift) => {
        const diff = shift.cash_difference ?? 0;
        return (
          <Card key={shift.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-text">
                  {new Date(shift.opened_at).toLocaleDateString("es-CL")}
                </p>
                <p className="text-xs text-text-secondary">
                  {new Date(shift.opened_at).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  →{" "}
                  {shift.closed_at
                    ? new Date(shift.closed_at).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-text-secondary text-xs">Ventas</p>
                  <p className="font-semibold text-text">
                    {fmt(shift.total_sales)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-text-secondary text-xs">Diferencia</p>
                  <p
                    className={`font-semibold ${
                      diff === 0
                        ? "text-success"
                        : diff > 0
                        ? "text-amber-600"
                        : "text-error"
                    }`}
                  >
                    {formatDifference(diff, restaurant?.currency || "CLP")}
                  </p>
                </div>
                <PrintReceiptButton shift={shift} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// =========================================================================
// Comprobante imprimible (createPortal + window.print, patrón del POS)
// =========================================================================

const PrintReceiptButton: React.FC<{
  shift: CashShiftRow;
  restaurantName?: string;
}> = ({ shift, restaurantName }) => {
  const fmt = useCashFormat();
  const { restaurant } = useAuth();
  const [printData, setPrintData] = useState<CashShiftRow | null>(null);

  useEffect(() => {
    if (!printData) return;
    // Pequeño retardo para que el portal se monte antes de imprimir.
    const t = setTimeout(() => {
      window.print();
    }, 50);
    return () => clearTimeout(t);
  }, [printData]);

  if (!printData) {
    return (
      <Button variant="secondary" onClick={() => setPrintData(shift)}>
        <Printer className="w-4 h-4 mr-1" /> Imprimir
      </Button>
    );
  }

  return createPortal(
    <div className="print-receipt-container">
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <strong style={{ fontSize: "13px" }}>{restaurantName || "Cierre de Caja"}</strong>
        <p style={{ margin: "0" }}>REPORTE DE TURNO</p>
      </div>
      <p style={{ margin: "0" }}>
        Turno: {new Date(shift.opened_at).toLocaleString("es-CL")}
      </p>
      <p style={{ margin: "0" }}>
        Cierre:{" "}
        {shift.closed_at
          ? new Date(shift.closed_at).toLocaleString("es-CL")
          : "—"}
      </p>
      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      <p style={{ margin: "0" }}>
        <strong>Ventas por método</strong>
      </p>
      <p style={{ margin: "0" }}>Efectivo: {fmt(shift.cash_sales)}</p>
      <p style={{ margin: "0" }}>Tarjeta: {fmt(shift.card_sales)}</p>
      <p style={{ margin: "0" }}>Transferencia: {fmt(shift.transfer_sales)}</p>
      <p style={{ margin: "0" }}>QR: {fmt(shift.qr_sales)}</p>
      <p style={{ margin: "0" }}>
        <strong>Total ventas: {fmt(shift.total_sales)}</strong>
      </p>
      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      <p style={{ margin: "0" }}>
        Propinas totales: {fmt(shift.total_tips)}
      </p>
      <p style={{ margin: "0" }}>
        Propinas efectivo: {fmt(shift.cash_tips)}
      </p>
      {shift.waiter_summary?.length > 0 && (
        <>
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
          <p style={{ margin: "0" }}>
            <strong>Propinas por mesero</strong>
          </p>
          {shift.waiter_summary.map((w) => (
            <p key={w.waiter_id} style={{ margin: "0" }}>
              {w.name}: {fmt(w.tips)}
            </p>
          ))}
        </>
      )}
      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
      <p style={{ margin: "0" }}>Fondo inicial: {fmt(shift.opening_cash)}</p>
      <p style={{ margin: "0" }}>
        Efectivo esperado: {fmt(shift.expected_cash)}
      </p>
      <p style={{ margin: "0" }}>
        Efectivo contado: {fmt(shift.actual_cash ?? 0)}
      </p>
      <p style={{ margin: "0" }}>
        <strong>
          Diferencia: {formatDifference(shift.cash_difference ?? 0, restaurant?.currency || "CLP")}
        </strong>
      </p>
      {shift.notes && (
        <p style={{ margin: "6px 0 0 0" }}>Notas: {shift.notes}</p>
      )}
    </div>,
    document.body
  );
};

// =========================================================================
// Sub-componentes UI
// =========================================================================

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  tint?: string;
}> = ({ icon, label, value, tint }) => (
  <Card className="p-4">
    <div className={`inline-flex p-2 rounded-lg ${tint || "bg-bg-subtle"}`}>
      {icon}
    </div>
    <p className="text-xs text-text-secondary mt-2">{label}</p>
    <p className="text-lg font-bold text-text">{value}</p>
  </Card>
);

const MethodRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-text-secondary">{icon}</span>
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="font-semibold text-text">{value}</p>
    </div>
  </div>
);

const Row: React.FC<{
  label: string;
  value: string;
  strong?: boolean;
  tone?: "ok" | "warn" | "err";
}> = ({ label, value, strong, tone }) => (
  <div className="flex items-center justify-between">
    <span className={strong ? "font-semibold text-text" : "text-text-secondary"}>
      {label}
    </span>
    <span
      className={`${
        strong ? "font-semibold text-text" : "text-text"
      } ${
        tone === "ok"
          ? "text-success"
          : tone === "warn"
          ? "text-amber-600"
          : tone === "err"
          ? "text-error"
          : ""
      }`}
    >
      {value}
    </span>
  </div>
);
