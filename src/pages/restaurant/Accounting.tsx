// =====================================================================
// Página: Contabilidad (panel del dueño — Chile)
//
// Módulo tributario conectado al motor cmorflow-tax-api vía la edge
// function "accounting". Experiencia inspirada en el módulo Contabilidad
// de APR: navegación principal → página con pestañas → estados claros.
//
// Pestañas:
//   - Resumen: stat cards del período (emitidas, monto, IVA estimado, rechazos).
//   - Documentos: tabla de DTEs con estado SII, descarga XML/PDF, notas de
//     crédito y emisión manual (boleta/factura).
//   - Configuración: conexión al motor, credencial y emisión automática.
// =====================================================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  FileDown,
  RefreshCw,
  Landmark,
  FileText,
  CheckCircle,
  XCircle,
  CircleDollarSign,
  Percent,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Loading,
  Modal,
  Select,
  Tabs,
  Textarea,
} from "../../components/ui";
import { useAuth, useRestaurantId } from "../../hooks/useAuth";
import { usePanelLang } from "../../i18n/panel-language";
import { formatCurrency } from "../../utils/helpers";
import {
  PERIOD_LABELS,
  computeNetIva,
  dteTypeLabel,
  docHasArtifacts,
  formatRut,
  isValidRutChile,
  periodRange,
  santiagoDateString,
  statusMeta,
} from "../../utils/accounting";
import type { PeriodKey } from "../../utils/accounting";
import {
  emitBoleta,
  emitCreditNote,
  emitFactura,
  getAccountingConfig,
  getArtifactLinks,
  listAccountingDocuments,
  listRecentPaidOrders,
  syncAccounting,
  updateAccountingConfig,
} from "../../services/accountingService";
import type {
  AccountingConfigResult,
  AccountingDocument,
  EmittableOrder,
  FacturaReceiverInput,
} from "../../services/accountingService";

type Feedback = { type: "success" | "error" | "info"; message: string } | null;

const Accounting: React.FC = () => {
  const restaurantId = useRestaurantId();
  const { restaurant } = useAuth();
  const { t } = usePanelLang();
  const isChile = restaurant?.country === "CL";

  const [config, setConfig] = useState<AccountingConfigResult | null>(null);
  const [documents, setDocuments] = useState<AccountingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("today");

  // Modales
  const [boletaModalOpen, setBoletaModalOpen] = useState(false);
  const [facturaModalOpen, setFacturaModalOpen] = useState(false);
  const [ncTarget, setNcTarget] = useState<AccountingDocument | null>(null);
  const [ncReason, setNcReason] = useState("");
  const [emittable, setEmittable] = useState<EmittableOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [receiver, setReceiver] = useState<FacturaReceiverInput>({
    rut: "",
    name: "",
    giro: "",
    address: "",
    commune: "",
  });
  const [receiverError, setReceiverError] = useState("");
  const [emitting, setEmitting] = useState(false);

  // Configuración
  const [autoEmit, setAutoEmit] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [credKeyId, setCredKeyId] = useState("");
  const [credSecret, setCredSecret] = useState("");
  const [savingCred, setSavingCred] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!restaurantId) return;
    const res = await listAccountingDocuments(restaurantId, { limit: 300 });
    if (res.success && res.data) setDocuments(res.data);
  }, [restaurantId]);

  const loadConfig = useCallback(async () => {
    if (!restaurantId) return;
    const res = await getAccountingConfig(restaurantId);
    setConfig(res);
    if (res.auto_emit !== undefined) setAutoEmit(Boolean(res.auto_emit));
  }, [restaurantId]);

  const loadEmittable = useCallback(async () => {
    if (!restaurantId) return;
    const res = await listRecentPaidOrders(restaurantId);
    if (!res.success || !res.data) return;
    const blocked = new Set(
      documents
        .filter(
          (d) =>
            d.order_id &&
            // En curso o ya aceptado bloquean; rechazados/fallidos NO:
            // la re-emisión manual es la válvula de escape tras agotar los
            // 3 intentos automáticos (el edge lo permite siempre en manual).
            ["queued", "processing", "submitted", "accepted", "observed"].includes(d.status)
        )
        .map((d) => d.order_id as string)
    );
    setEmittable(res.data.filter((o) => !blocked.has(o.id)));
  }, [restaurantId, documents]);

  useEffect(() => {
    if (!isChile) return;
    (async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadDocuments()]);
      setLoading(false);
    })();
  }, [isChile, loadConfig, loadDocuments]);

  const handleSync = async () => {
    if (!restaurantId || syncing) return;
    setSyncing(true);
    setFeedback(null);
    const res = await syncAccounting(restaurantId);
    await Promise.all([loadConfig(), loadDocuments()]);
    setSyncing(false);
    if (res.success) {
      setFeedback({ type: "success", message: "Sincronización completada." });
    } else {
      setFeedback({
        type: "error",
        message: res.message || "No se pudo sincronizar con el motor tributario.",
      });
    }
  };

  const handleDownload = async (doc: AccountingDocument, kind: "xml" | "pdf") => {
    if (!restaurantId) return;
    const res = await getArtifactLinks(restaurantId, doc.id);
    if (res.success && res.data) {
      window.open(kind === "xml" ? res.data.xmlUrl : res.data.pdfUrl, "_blank", "noopener");
    } else {
      setFeedback({ type: "error", message: "No se pudieron generar los enlaces de descarga." });
    }
  };

  const openEmitModal = async (kind: "boleta" | "factura") => {
    await loadEmittable();
    setSelectedOrderId("");
    setReceiverError("");
    if (kind === "boleta") setBoletaModalOpen(true);
    else setFacturaModalOpen(true);
  };

  const handleEmit = async (kind: "boleta" | "factura") => {
    if (!restaurantId || !selectedOrderId) return;
    if (kind === "factura") {
      if (!receiver.name.trim()) {
        setReceiverError("La razón social es obligatoria.");
        return;
      }
      if (!isValidRutChile(receiver.rut)) {
        setReceiverError("El RUT es inválido (revisa el dígito verificador).");
        return;
      }
    }
    setEmitting(true);
    const res =
      kind === "boleta"
        ? await emitBoleta(restaurantId, selectedOrderId)
        : await emitFactura(restaurantId, selectedOrderId, receiver);
    setEmitting(false);
    if (res.success) {
      setBoletaModalOpen(false);
      setFacturaModalOpen(false);
      setFeedback({
        type: "success",
        message:
          kind === "boleta"
            ? "Boleta enviada al motor. El folio aparece cuando el SII la acepta."
            : "Factura enviada al motor. El folio aparece cuando el SII la acepta.",
      });
      await loadDocuments();
    } else {
      setReceiverError(res.error === "items_mismatch"
        ? "Los ítems de la orden no cuadran con el total cobrado. Contacta a soporte."
        : res.message || "No se pudo emitir el documento.");
    }
  };

  const handleCreditNote = async () => {
    if (!restaurantId || !ncTarget) return;
    setEmitting(true);
    const res = await emitCreditNote(restaurantId, ncTarget.id, ncReason.trim());
    setEmitting(false);
    if (res.success) {
      setNcTarget(null);
      setNcReason("");
      setFeedback({ type: "success", message: "Nota de crédito enviada al motor." });
      await loadDocuments();
    } else {
      setFeedback({ type: "error", message: res.message || "No se pudo emitir la nota de crédito." });
    }
  };

  const handleSaveAutoEmit = async () => {
    if (!restaurantId) return;
    setSavingConfig(true);
    const res = await updateAccountingConfig(restaurantId, { auto_emit: autoEmit });
    setSavingConfig(false);
    setFeedback(
      res.success
        ? { type: "success", message: "Configuración guardada." }
        : { type: "error", message: "No se pudo guardar la configuración." }
    );
  };

  const handleSaveCredential = async () => {
    if (!restaurantId || !credKeyId.trim() || !credSecret.trim()) return;
    setSavingCred(true);
    const res = await updateAccountingConfig(restaurantId, {
      credential: { key_id: credKeyId.trim(), secret: credSecret.trim() },
    });
    setSavingCred(false);
    if (res.success) {
      setCredKeyId("");
      setCredSecret("");
      setFeedback({
        type: "success",
        message: "Credencial validada y guardada. El módulo ya está conectado al motor.",
      });
      await loadConfig();
    } else {
      setFeedback({
        type: "error",
        message:
          res.error === "credencial_invalida"
            ? `La credencial no pasó la validación contra el motor: ${res.detail ?? "sin detalle"}`
            : res.message || "No se pudo guardar la credencial.",
      });
    }
  };

  // ── Resumen del período (documentos de venta: 33 y 39) ──
  const summary = useMemo(() => {
    const { from, to } = periodRange(period);
    const inPeriod = documents.filter(
      (d) => d.dte_type !== 61 && d.created_at >= from && d.created_at <= to
    );
    const acceptedDocs = inPeriod.filter((d) => d.status === "accepted" || d.status === "observed");
    const rejectedDocs = inPeriod.filter((d) => d.status === "rejected" || d.status === "failed");
    const acceptedTotal = acceptedDocs.reduce((sum, d) => sum + Number(d.amount ?? 0), 0);
    const boletas = acceptedDocs.filter((d) => d.dte_type === 39).length;
    const facturas = acceptedDocs.filter((d) => d.dte_type === 33).length;
    return {
      acceptedCount: acceptedDocs.length,
      rejectedCount: rejectedDocs.length,
      pendingCount: inPeriod.filter((d) =>
        ["queued", "processing", "submitted"].includes(d.status)
      ).length,
      acceptedTotal,
      iva: computeNetIva(acceptedTotal).iva,
      boletas,
      facturas,
    };
  }, [documents, period]);

  const filteredDocs = useMemo(
    () => (statusFilter ? documents.filter((d) => d.status === statusFilter) : documents),
    [documents, statusFilter]
  );

  if (!isChile) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Landmark className="w-6 h-6" /> {t("Contabilidad")}
        </h1>
        <Alert
          type="info"
          title="Próximamente"
          message="La emisión de documentos tributarios electrónicos está disponible para restaurantes en Chile (boletas y facturas del SII). Otros países llegarán más adelante."
        />
      </div>
    );
  }

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Loading />
      </div>
    );

  const notConfigured = !config?.configured;

  // ── Modal selector de orden (compartido por boleta y factura) ──
  const orderSelector = (
    <Select
      label="Orden pagada"
      value={selectedOrderId}
      onChange={(e) => setSelectedOrderId(e.target.value)}
      options={[
        { value: "", label: emittable.length ? "Selecciona una orden…" : "No hay órdenes pendientes" },
        ...emittable.map((o) => ({
          value: o.id,
          label: `${o.order_number} — ${formatCurrency(o.total, restaurant?.currency || "CLP")} (${santiagoDateString(new Date(o.created_at))})`,
        })),
      ]}
    />
  );

  const tabs = [
    {
      key: "resumen",
      label: t("Resumen"),
      content: (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "primary" : "outline"}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-secondary">Aceptados por el SII</p>
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-text">{summary.acceptedCount}</p>
              <p className="text-xs text-text-secondary mt-1">
                {summary.boletas} boletas · {summary.facturas} facturas
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-secondary">Monto aceptado</p>
                <CircleDollarSign className="w-4 h-4 text-accent" />
              </div>
              <p className="text-2xl font-bold text-text">
                {formatCurrency(summary.acceptedTotal, restaurant?.currency || "CLP")}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-secondary">IVA débito fiscal estimado</p>
                <Percent className="w-4 h-4 text-accent-secondary" />
              </div>
              <p className="text-2xl font-bold text-text">
                {formatCurrency(summary.iva, restaurant?.currency || "CLP")}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-text-secondary">Rechazados / fallidos</p>
                <XCircle className="w-4 h-4 text-error" />
              </div>
              <p className="text-2xl font-bold text-text">{summary.rejectedCount}</p>
              <p className="text-xs text-text-secondary mt-1">{summary.pendingCount} en curso</p>
            </Card>
          </div>
          <Alert
            type="info"
            message="El IVA débito fiscal es una estimación sobre documentos aceptados (19%). El dato oficial lo entrega tu declaración de F29 del SII."
          />
        </div>
      ),
    },
    {
      key: "documentos",
      label: t("Documentos"),
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex gap-2">
              <Button size="sm" icon={<FileText className="w-4 h-4" />} onClick={() => openEmitModal("boleta")}>
                Emitir boleta
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={<FileText className="w-4 h-4" />}
                onClick={() => openEmitModal("factura")}
              >
                Emitir factura
              </Button>
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="max-w-[220px]"
              options={[
                { value: "", label: "Todos los estados" },
                { value: "queued", label: "En cola" },
                { value: "processing", label: "Procesando" },
                { value: "submitted", label: "Enviado al SII" },
                { value: "accepted", label: "Aceptado" },
                { value: "observed", label: "Con reparo" },
                { value: "rejected", label: "Rechazado" },
                { value: "failed", label: "Fallido" },
              ]}
            />
          </div>

          {filteredDocs.length === 0 ? (
            <Card className="p-10 text-center text-text-secondary">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-text">Sin documentos tributarios</p>
              <p className="text-sm mt-1">
                Las boletas emitidas automáticamente (o manuales) aparecerán aquí con su estado en el SII.
              </p>
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="p-3 font-medium">Tipo</th>
                    <th className="p-3 font-medium">Folio</th>
                    <th className="p-3 font-medium">Receptor</th>
                    <th className="p-3 font-medium">Monto</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium">Fecha</th>
                    <th className="p-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => {
                    const meta = statusMeta(doc.status);
                    return (
                      <React.Fragment key={doc.id}>
                        <tr className="border-b border-border hover:bg-bg-subtle/50">
                          <td className="p-3 font-medium text-text">
                            {dteTypeLabel(doc.dte_type)}
                            {doc.attempt > 1 && (
                              <span className="ml-1 text-[10px] text-text-secondary">(intento {doc.attempt})</span>
                            )}
                          </td>
                          <td className="p-3 text-text">{doc.folio ?? "—"}</td>
                          <td className="p-3 text-text">
                            {doc.receiver_name
                              ? doc.receiver_name
                              : doc.dte_type === 39
                              ? "Consumidor final"
                              : "—"}
                            {doc.receiver_rut && (
                              <span className="block text-xs text-text-secondary">{formatRut(doc.receiver_rut)}</span>
                            )}
                          </td>
                          <td className="p-3 text-text">
                            {formatCurrency(Number(doc.amount ?? 0), restaurant?.currency || "CLP")}
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="p-3 text-text-secondary whitespace-nowrap">
                            {santiagoDateString(new Date(doc.created_at))}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1 justify-end">
                              {docHasArtifacts(doc) && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handleDownload(doc, "xml")}>
                                    XML
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDownload(doc, "pdf")}>
                                    <FileDown className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {doc.status === "accepted" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setNcTarget(doc);
                                    setNcReason("");
                                  }}
                                >
                                  Anular
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {doc.last_error && ["rejected", "failed", "queued"].includes(doc.status) && (
                          <tr key={`${doc.id}-err`} className="border-b border-border">
                            <td colSpan={7} className="p-2 pl-3">
                              <p className="text-xs text-error">{doc.last_error}</p>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: "config",
      label: t("Configuración"),
      content: (
        <div className="space-y-4 max-w-2xl">
          <Card className="p-4">
            <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
              <Landmark className="w-4 h-4" /> Conexión al motor tributario
            </h3>
            {notConfigured ? (
              <Alert
                type="warning"
                title="Módulo sin activar"
                message="Guarda la credencial API (cmor_live_…) que te entregó soporte para conectar este restaurante al motor de facturación electrónica."
              />
            ) : (
              <div className="text-sm space-y-1 text-text">
                <p>
                  Estado: <Badge variant="success">Conectado</Badge>
                </p>
                <p className="text-text-secondary">
                  Credencial: <code className="text-xs">{config?.key_id_masked ?? "—"}</code>
                </p>
                <p className="text-text-secondary">
                  Última sincronización:{" "}
                  {config?.last_sync_at
                    ? new Date(config.last_sync_at).toLocaleString("es-CL", { timeZone: "America/Santiago" })
                    : "—"}
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-text mb-2">Emisión automática de boletas</h3>
            <p className="text-sm text-text-secondary mb-3">
              Si la activas, cada orden pagada emite su boleta electrónica (39) automáticamente.
              Los intentos fallidos se reintentan hasta 3 veces y luego quedan disponibles para
              emisión manual.
            </p>
            <label className="flex items-center gap-2 text-sm text-text mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoEmit}
                onChange={(e) => setAutoEmit(e.target.checked)}
                className="w-4 h-4"
              />
              Emitir boletas automáticamente al cobrar
            </label>
            <Button size="sm" loading={savingConfig} onClick={handleSaveAutoEmit}>
              {t("Guardar")}
            </Button>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-text mb-2">Credencial del motor</h3>
            <p className="text-sm text-text-secondary mb-3">
              Se valida contra el motor antes de guardarse y se almacena cifrada. El secreto
              (cmc_…) solo se muestra una vez al crearla — pégalo aquí inmediatamente.
            </p>
            <div className="space-y-3">
              <Input
                label="Key ID (cmor_live_…)"
                value={credKeyId}
                onChange={(e) => setCredKeyId(e.target.value)}
                placeholder="cmor_live_..."
              />
              <Input
                label="Secreto (cmc_…)"
                type="password"
                value={credSecret}
                onChange={(e) => setCredSecret(e.target.value)}
                placeholder="Se muestra una sola vez al crear la credencial"
              />
              <Button size="sm" loading={savingCred} onClick={handleSaveCredential}>
                Validar y guardar credencial
              </Button>
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Landmark className="w-6 h-6" /> {t("Contabilidad")}
        </h1>
        <Button
          size="sm"
          variant="outline"
          icon={<RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />}
          loading={syncing}
          onClick={handleSync}
        >
          Sincronizar
        </Button>
      </div>

      {feedback && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}

      {notConfigured && (
        <Alert
          type="warning"
          message="Este restaurante aún no está conectado al motor de facturación electrónica. Completa la credencial en la pestaña Configuración."
        />
      )}

      <Tabs tabs={tabs} defaultActiveKey="resumen" />

      {/* Modal: emitir boleta */}
      <Modal isOpen={boletaModalOpen} onClose={() => setBoletaModalOpen(false)} title="Emitir boleta electrónica">
        <div className="space-y-4">
          {orderSelector}
          <p className="text-xs text-text-secondary">
            La boleta se emite por el total de la orden (IVA incluido). No se puede duplicar:
            cada orden tiene un único documento válido.
          </p>
          <Button fullWidth loading={emitting} disabled={!selectedOrderId} onClick={() => handleEmit("boleta")}>
            Emitir boleta
          </Button>
        </div>
      </Modal>

      {/* Modal: emitir factura */}
      <Modal isOpen={facturaModalOpen} onClose={() => setFacturaModalOpen(false)} title="Emitir factura electrónica">
        <div className="space-y-4">
          {orderSelector}
          <Input
            label="RUT del cliente *"
            value={receiver.rut}
            onChange={(e) => setReceiver({ ...receiver, rut: e.target.value })}
            placeholder="12.345.678-5"
            error={receiverError}
          />
          <Input
            label="Razón social *"
            value={receiver.name}
            onChange={(e) => setReceiver({ ...receiver, name: e.target.value })}
            placeholder="Empresa Cliente SpA"
          />
          <Input
            label="Giro"
            value={receiver.giro}
            onChange={(e) => setReceiver({ ...receiver, giro: e.target.value })}
            placeholder="Servicios de alimentación"
          />
          <Input
            label="Dirección"
            value={receiver.address}
            onChange={(e) => setReceiver({ ...receiver, address: e.target.value })}
            placeholder="Av. Principal 1234"
          />
          <Input
            label="Comuna"
            value={receiver.commune}
            onChange={(e) => setReceiver({ ...receiver, commune: e.target.value })}
            placeholder="Providencia"
          />
          <p className="text-xs text-text-secondary">
            El SII exige RUT, razón social, giro, dirección y comuna del receptor en las facturas.
          </p>
          <Button fullWidth loading={emitting} disabled={!selectedOrderId} onClick={() => handleEmit("factura")}>
            Emitir factura
          </Button>
        </div>
      </Modal>

      {/* Modal: nota de crédito (anulación) */}
      <Modal isOpen={Boolean(ncTarget)} onClose={() => setNcTarget(null)} title={`Anular documento ${ncTarget?.folio ?? ""}`}>
        <div className="space-y-4">
          <Alert
            type="warning"
            message="Se emitirá una nota de crédito (tipo 61) que anula el documento original. Esta acción no se puede deshacer."
          />
          <Textarea
            label="Motivo"
            value={ncReason}
            onChange={(e) => setNcReason(e.target.value)}
            placeholder="Anula documento por error de emisión"
            rows={3}
          />
          <Button fullWidth variant="danger" loading={emitting} onClick={handleCreditNote}>
            Emitir nota de crédito
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Accounting;
