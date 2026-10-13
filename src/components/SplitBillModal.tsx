import { currencyDecimals } from "../../shared/money";
import React, { useState, useMemo } from "react";
import { Users, Check } from "lucide-react";
import { Modal, Button, Input, Alert } from "./ui";
import type { SplitPaymentMethod } from "../config/supabase";
import { splitEqually, validateSplitTotals } from "../services/splitBillService";
import { formatCurrency } from "../utils/helpers";

interface SplitPart {
  amount: number;
  payment_method: SplitPaymentMethod;
  payer_label: string;
}

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (parts: SplitPart[]) => Promise<void>;
  /** Moneda del restaurante (multi-país); default CLP = comportamiento previo */
  currency?: string;
}

const METHODS: { value: SplitPaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
];

/**
 * Modal de división de cuenta.
 * Modos: "Igual" (N personas) o "Por monto" (input libre por parte).
 * Antes de confirmar, valida que la suma coincida con el total.
 */
export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  onClose,
  total,
  onConfirm,
  currency = "CLP",
}) => {
  const fmt = (amount: number) => formatCurrency(amount, currency);
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [people, setPeople] = useState(2);
  const [parts, setParts] = useState<SplitPart[]>([
    { amount: 0, payment_method: "cash", payer_label: "Persona 1" },
    { amount: 0, payment_method: "cash", payer_label: "Persona 2" },
  ]);
  // Strings locales para los inputs de monto (evita el bug del input controlado
  // donde parseFloat("") || 0 resetea a "0" mientras el usuario tipea).
  const [amountStrings, setAmountStrings] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // En modo igual, calcular automáticamente
  const equalSplit = useMemo(() => splitEqually(total, people, currencyDecimals(currency)), [total, people,currency]);

  const activeParts = mode === "equal"
    ? Array.from({ length: people }).map((_, i) => ({
        amount: equalSplit.parts[i],
        payment_method: parts[i]?.payment_method ?? "cash",
        payer_label: `Persona ${i + 1}`,
      }))
    : parts;

  const validation = useMemo(
    () => validateSplitTotals(activeParts.map((p) => p.amount), total, currencyDecimals(currency)),
    [activeParts, total,currency]
  );

  const updatePart = (index: number, updates: Partial<SplitPart>) => {
    const next = [...parts];
    next[index] = { ...next[index], ...updates };
    setParts(next);
  };

  const addPart = () => {
    setParts([
      ...parts,
      { amount: 0, payment_method: "cash", payer_label: `Persona ${parts.length + 1}` },
    ]);
    setAmountStrings((prev) => [...prev, ""]);
  };

  const removePart = (index: number) => {
    if (parts.length <= 1) return;
    setParts(parts.filter((_, i) => i !== index));
    setAmountStrings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!validation.valid) {
      setError(
        `La suma ($${validation.sum}) no coincide con el total ($${total}). Diferencia: $${validation.difference}`
      );
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(activeParts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar la división");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dividir Cuenta"
      size="lg"
    >
      <div className="space-y-4">
        {/* Selector de modo */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("equal")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              mode === "equal"
                ? "bg-accent text-white border-accent"
                : "bg-bg text-text-secondary border-border hover:bg-bg-subtle"
            }`}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Partes iguales
          </button>
          <button
            onClick={() => {
              setMode("custom");
              // Pre-llenar los inputs con los montos actuales (o división igual)
              setAmountStrings(
                parts.map((_, i) => {
                  const a = activeParts[i]?.amount ?? 0;
                  return a > 0 ? String(a) : "";
                })
              );
            }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              mode === "custom"
                ? "bg-accent text-white border-accent"
                : "bg-bg text-text-secondary border-border hover:bg-bg-subtle"
            }`}
          >
            Por monto
          </button>
        </div>

        {/* Total a dividir */}
        <div className="bg-bg-subtle rounded-lg p-3 flex justify-between items-center">
          <span className="text-sm text-text-secondary">Total a dividir:</span>
          <span className="text-lg font-extrabold text-accent">
            {fmt(total)}
          </span>
        </div>

        {/* Configuración modo igual */}
        {mode === "equal" && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text">
              N° de personas:
            </label>
            <Input
              type="number"
              min={2}
              max={20}
              value={people}
              onChange={(e) => setPeople(Math.max(2, Math.min(20, Number(e.target.value) || 2)))}
              className="w-24"
            />
          </div>
        )}

        {/* Lista de partes */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activeParts.map((part, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 bg-bg rounded-lg border border-border"
            >
              <span className="text-xs font-bold text-text-secondary w-16 shrink-0">
                {part.payer_label}
              </span>
              {mode === "custom" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountStrings[i] ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setAmountStrings((prev) => {
                      const next = [...prev];
                      next[i] = raw;
                      return next;
                    });
                    const parsed = parseFloat(raw);
                    updatePart(i, { amount: isNaN(parsed) ? 0 : parsed });
                  }}
                  placeholder="$0"
                  className="input flex-1 min-w-0 text-base px-3 py-2"
                />
              ) : (
                <span className="flex-1 text-sm font-bold text-text">
                  {fmt(part.amount)}
                </span>
              )}
              <select
                aria-label={`Medio de pago ${part.payer_label}`}
                value={part.payment_method}
                onChange={(e) =>
                  mode === "custom"
                    ? updatePart(i, {
                        payment_method: e.target.value as SplitPaymentMethod,
                      })
                    : setParts((prev) => {
                        const next = [...prev];
                        while (next.length <= i) {
                          next.push({
                            amount: 0,
                            payment_method: "cash",
                            payer_label: `Persona ${next.length + 1}`,
                          });
                        }
                        next[i] = {
                          ...next[i],
                          payment_method: e.target.value as SplitPaymentMethod,
                        };
                        return next;
                      })
                }
                className="input w-auto shrink-0 text-sm px-2 py-2"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {mode === "custom" && parts.length > 1 && (
                <button
                  onClick={() => removePart(i)}
                  className="text-text-secondary hover:text-error text-sm px-1 shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Botón añadir (solo custom) */}
        {mode === "custom" && parts.length < 20 && (
          <Button variant="outline" size="sm" onClick={addPart}>
            + Añadir persona
          </Button>
        )}

        {/* Validación */}
        <div className="flex justify-between text-sm pt-2 border-t border-border">
          <span className="text-text-secondary">Suma actual:</span>
          <span
            className={`font-bold ${
              validation.valid ? "text-success" : "text-error"
            }`}
          >
            {fmt(validation.sum)}
            {validation.valid && <Check className="w-4 h-4 inline ml-1" />}
          </span>
        </div>

        {error && <Alert type="error" message={error} />}

        {!validation.valid && (
          <Alert
            type="warning"
            message={`Diferencia de ${fmt(Math.abs(validation.difference))}. Ajusta los montos para que coincidan con el total.`}
          />
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation.valid || submitting}
            loading={submitting}
          >
            Confirmar división
          </Button>
        </div>
      </div>
    </Modal>
  );
};
