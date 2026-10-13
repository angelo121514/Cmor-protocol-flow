import React, { useState } from "react";
import { Delete, UserCheck } from "lucide-react";
import { Button, Alert } from "./ui";

interface WaiterPinPadProps {
  onSubmit: (pin: string) => Promise<void>;
  onCancel?: () => void;
  title?: string;
}

/**
 * Teclado numérico estilo POS para que el mesero ingrese su PIN.
 * El PIN nunca se almacena en estado global; solo vive aquí durante el input.
 */
export const WaiterPinPad: React.FC<WaiterPinPadProps> = ({
  onSubmit,
  onCancel,
  title = "Ingresa tu PIN de mesero",
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    setError("");
    if (pin.length >= 6) return;
    setPin(pin + digit);
  };

  const handleDelete = () => {
    setError("");
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError("El PIN debe tener al menos 4 dígitos");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit(pin);
      setPin("");
    } catch {
      setError("PIN incorrecto. Intenta de nuevo.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-xs mx-auto">
      <div className="flex items-center gap-2 text-text">
        <UserCheck className="w-5 h-5" />
        <h3 className="font-semibold">{title}</h3>
      </div>

      {/* Display de PIN */}
      <div className="w-full flex justify-center gap-2 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border border-border ${
              i < pin.length ? "bg-accent" : "bg-transparent"
            }`}
          />
        ))}
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Teclado */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {digits.map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="aspect-square rounded-xl bg-bg border border-border text-xl font-bold text-text hover:bg-bg-subtle active:scale-95 transition-all"
          >
            {d}
          </button>
        ))}
        <button
          onClick={onCancel ?? handleDelete}
          className="aspect-square rounded-xl bg-bg border border-border text-text-secondary hover:bg-bg-subtle active:scale-95 transition-all flex items-center justify-center"
        >
          {onCancel ? "✕" : <Delete className="w-5 h-5" />}
        </button>
        <button
          onClick={() => handleDigit("0")}
          className="aspect-square rounded-xl bg-bg border border-border text-xl font-bold text-text hover:bg-bg-subtle active:scale-95 transition-all"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="aspect-square rounded-xl bg-bg border border-border text-text-secondary hover:bg-bg-subtle active:scale-95 transition-all flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      <Button
        fullWidth
        loading={loading}
        onClick={handleSubmit}
        disabled={pin.length < 4}
      >
        Validar
      </Button>
    </div>
  );
};
