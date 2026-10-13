import type { Order } from '../config/supabase';

export type PosPayload = Partial<Order> & { tip_amount?: number; split_parts?: unknown[] };
export type PosMode = 'kitchen' | 'collect' | 'split';
export interface PendingPosOperation {
  key: string; signature: string; payload: PosPayload; orderId: string | null; mode: PosMode;
}
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const signature = (payload: PosPayload, orderId: string | null) => JSON.stringify({ payload, id: orderId });

export function readPosOperation(scope: string, restaurantId: string, storage: Store = sessionStorage): PendingPosOperation | null {
  const raw = storage.getItem(scope + ':operation');
  if (!raw) return null;
  const value = JSON.parse(raw) as Partial<PendingPosOperation>;
  // Preserve a pre-upgrade pending key: the old signature contained the original request.
  if (!value.payload && typeof value.signature === 'string') {
    const previous = JSON.parse(value.signature) as { payload: PosPayload; id: string | null };
    value.payload = previous.payload; value.orderId = previous.id ?? null;
    value.mode = value.payload.split_parts ? 'split' : value.payload.payment_status === 'paid' ? 'collect' : 'kitchen';
  }
  if (typeof value.key !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.key) ||
      value.payload?.restaurant_id !== restaurantId || !Array.isArray(value.payload.items) ||
      !['kitchen', 'collect', 'split'].includes(value.mode ?? '') ||
      value.signature !== signature(value.payload, value.orderId ?? null)) {
    throw new Error('Registro de cobro pendiente inválido. Requiere conciliación antes de cobrar nuevamente.');
  }
  return value as PendingPosOperation;
}

export function reservePosOperation(scope: string, payload: PosPayload, orderId: string | null, mode: PosMode, storage: Store = sessionStorage): PendingPosOperation {
  if (!payload.restaurant_id) throw new Error('Sucursal no disponible');
  const previous = readPosOperation(scope, payload.restaurant_id, storage);
  const fingerprint = signature(payload, orderId);
  if (previous && previous.signature !== fingerprint) {
    throw new Error('Resuelve el cobro pendiente antes de iniciar otra operación.');
  }
  const operation = previous ?? { key: crypto.randomUUID(), signature: fingerprint, payload, orderId, mode };
  // Failure to persist prevents the RPC, so a reload cannot silently create another key.
  storage.setItem(scope + ':operation', JSON.stringify(operation));
  return operation;
}

export function finishPosOperation(scope: string, storage: Store = sessionStorage) {
  storage.removeItem(scope + ':operation');
}

export function isRolledBackPosError(error: { code?: string }) {
  // Transport/authentication/idempotency conflicts remain unresolved. Only a SQL rejection
  // proving this transaction rolled back permits editing and reserving a different request.
  return error.code?.startsWith('22') || ['23514', 'P0001'].includes(error.code ?? '');
}
