// =====================================================================
// Builders puros: orden de CMOR FLOW → payload DTE del motor tributario.
//
// Reglas CL (verificadas contra create_order y el DTO del motor):
//  - Los precios de carta son BRUTOS (IVA 19% incluido): orders.total es la
//    suma directa de la carta, orders.subtotal = total/1.19, orders.tax = IVA.
//    → pricingMode 'GROSS' y unitPrice = precio de carta.
//  - totals NO se declara: el motor recalcula y valida (sin TOTALS_MISMATCH).
//  - Boleta 39: receptor opcional. Factura 33: rut + name obligatorios,
//    giro/address/commune recomendados por el SII.
// =====================================================================

import type { TaxApiDtePayload, TaxApiItem, TaxApiNotePayload, TaxApiReceiver } from "./tax-types.ts";

export const IVA_RATE = 0.19;

/**
 * Valida RUT chileno: formato (puntos/guion opcionales) + dígito
 * verificador módulo 11. El motor revalida con IsChileanRut; esto da un
 * error temprano y claro antes de gastar un folio.
 */
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

/** Desglose display de un monto bruto: neto = round(total/1.19), IVA = resto. */
export function computeNetIva(
  total: number,
  rate: number = IVA_RATE
): { net: number; iva: number } {
  const gross = Math.round(Number(total) || 0);
  const net = Math.round(gross / (1 + rate));
  return { net, iva: gross - net };
}

/** Referencia externa de emisión por orden (el attempt permite re-emitir tras rechazo). */
export function buildOrderExternalReference(orderId: string, dteType: number, attempt: number): string {
  return `order:${orderId}:${dteType}:a${attempt}`;
}

/** Referencia externa de una nota de crédito sobre un documento local. */
export function buildCreditNoteReference(documentId: string, attempt: number): string {
  return `nc:${documentId}:a${attempt}`;
}

/** Item almacenado en orders.items (JSONB plano de create_order). */
export interface OrderItemLike {
  name?: string;
  quantity?: number;
  unit_price?: number;
  item_total?: number;
  selected_size?: { name?: string } | null;
}

/** Campos de la orden que necesita el builder (fila de orders). */
export interface OrderLike {
  order_number?: string;
  items?: OrderItemLike[] | unknown;
  total?: number;
  customer_name?: string | null;
}

function itemDisplayName(item: OrderItemLike): string {
  const base = (item.name ?? "Item").trim();
  const size = item.selected_size?.name?.trim();
  return size ? `${base} (${size})` : base;
}

/**
 * Construye el payload del DTE desde una orden pagada.
 * Devuelve también la suma de los item_total para validación server-side
 * contra orders.total (el motor no debe recibir items que no cuadren).
 */
export function buildDtePayloadFromOrder(
  order: OrderLike,
  opts: { dteType: 39 | 33; receiver?: TaxApiReceiver }
): { payload: TaxApiDtePayload; itemsTotal: number } {
  const rawItems = Array.isArray(order.items) ? (order.items as OrderItemLike[]) : [];
  const items: TaxApiItem[] = rawItems.map((item) => ({
    name: itemDisplayName(item),
    quantity: Number(item.quantity ?? 1),
    unitPrice: Math.round(Number(item.unit_price ?? 0)),
  }));
  const itemsTotal = rawItems.reduce(
    (sum, item) => sum + Math.round(Number(item.item_total ?? (Number(item.unit_price ?? 0) * Number(item.quantity ?? 1)))),
    0
  );

  const payload: TaxApiDtePayload = {
    documentType: opts.dteType,
    items,
    pricingMode: "GROSS",
    metadata: { orderNumber: order.order_number ?? null },
  };
  if (opts.dteType === 33 && opts.receiver) {
    payload.receiver = opts.receiver;
  }
  return { payload, itemsTotal };
}

/**
 * Nota de crédito de anulación (reasonCode 1) sobre un documento aceptado.
 * Según GUIDE: en anulación se envía una línea simbólica $0.
 */
export function buildCreditNotePayload(opts: {
  folio?: number | null;
  dteType?: number | null;
  reason: string;
}): TaxApiNotePayload {
  const target = opts.folio ? `folio ${opts.folio}` : "documento original";
  return {
    reasonCode: 1,
    reason: opts.reason || `Anula ${target} por error de emisión`,
    items: [{ name: `Anulación ${target}`, quantity: 1, unitPrice: 0 }],
  };
}
