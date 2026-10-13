// =====================================================================
// Helpers puros del módulo Contabilidad (DTE Chile).
// Testeados en src/tests/unit/U24-accounting.test.ts.
// =====================================================================

export const IVA_RATE = 0.19;

/** Desglose display de un monto bruto: neto = round(total/1.19), IVA = resto. */
export function computeNetIva(
  total: number,
  rate: number = IVA_RATE
): { net: number; iva: number } {
  const gross = Math.round(Number(total) || 0);
  const net = Math.round(gross / (1 + rate));
  return { net, iva: gross - net };
}

/** Valida RUT chileno: formato (puntos/guion opcionales) + DV módulo 11. */
export function isValidRutChile(rut: string): boolean {
  const clean = (rut ?? "").replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rest = 11 - (sum % 11);
  const expected = rest === 11 ? "0" : rest === 10 ? "K" : String(rest);
  return dv === expected;
}

/** Formatea un RUT limpio a 12.345.678-9 para display. */
export function formatRut(rut: string): string {
  const clean = (rut ?? "").replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return rut ?? "";
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

export interface StatusMeta {
  label: string;
  /** Clases Tailwind del badge. */
  badge: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  queued: { label: "En cola", badge: "bg-bg-subtle text-text-secondary border-border" },
  processing: { label: "Procesando", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  submitted: { label: "Enviado al SII", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  accepted: { label: "Aceptado", badge: "bg-success/10 text-success border-success/20" },
  observed: { label: "Con reparo", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  rejected: { label: "Rechazado", badge: "bg-error/10 text-error border-error/20" },
  failed: { label: "Fallido", badge: "bg-error/10 text-error border-error/20" },
  cancelled: { label: "Anulado", badge: "bg-bg-subtle text-text-secondary border-border" },
};

export function statusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? {
      label: status,
      badge: "bg-bg-subtle text-text-secondary border-border",
    }
  );
}

export function dteTypeLabel(dteType: number): string {
  switch (dteType) {
    case 33: return "Factura";
    case 39: return "Boleta";
    case 61: return "Nota de crédito";
    default: return `DTE ${dteType}`;
  }
}

/** Estados que ya producen artefactos descargables en el motor. */
export function docHasArtifacts(doc: { status?: string; dte_id?: string | null }): boolean {
  return Boolean(doc.dte_id) && ["submitted", "accepted", "observed", "rejected", "failed", "cancelled"].includes(doc.status ?? "");
}

// ── Tiempo: America/Santiago explícito (CLT/CLST), nunca UTC implícito ──

export const CL_TIMEZONE = "America/Santiago";

/** Fecha local de Santiago de un instante, formato YYYY-MM-DD (en-CA). */
export function santiagoDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Offset (ms) de America/Santiago respecto a UTC en un instante dado. */
function santiagoOffsetMs(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: CL_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    parts.year, parts.month - 1, parts.day,
    parts.hour === 24 ? 0 : parts.hour, parts.minute, parts.second
  );
  return asUtc - date.getTime();
}

/** Instante UTC de la medianoche (00:00) en Santiago de una fecha YYYY-MM-DD. */
export function santiagoDayStartInstant(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 12); // mediodía: evita bordes de DST
  const offset = santiagoOffsetMs(new Date(guess));
  const midnightLocal = Date.UTC(y, m - 1, d) - offset;
  return new Date(midnightLocal);
}

export type PeriodKey = "today" | "7d" | "30d";

const PERIOD_DAYS: Record<PeriodKey, number> = { today: 0, "7d": 6, "30d": 29 };

/** Rango [from, to] en UTC para filtrar documentos por período en Santiago. */
export function periodRange(period: PeriodKey, now: Date = new Date()): { from: string; to: string } {
  const days = PERIOD_DAYS[period];
  const todayStr = santiagoDateString(now);
  const startInstant = santiagoDayStartInstant(todayStr);
  const from = days === 0 ? startInstant : new Date(startInstant.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: new Date(now.getTime() + 60_000).toISOString() };
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Hoy",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
};
