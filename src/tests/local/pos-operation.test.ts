import { beforeEach, describe, expect, it } from 'vitest';
import { finishPosOperation, isRolledBackPosError, readPosOperation, reservePosOperation } from '../../services/pos-operation';
const payload = { restaurant_id: 'restaurant-A', items: [] };
beforeEach(() => sessionStorage.clear());
describe('POS uncertain collection recovery', () => {
  it('reload recovers the exact body and key; changed content stays blocked until resolution', () => {
    const original = reservePosOperation('pos:A', payload, null, 'collect');
    expect(readPosOperation('pos:A', 'restaurant-A')).toEqual(original);
    expect(reservePosOperation('pos:A', payload, null, 'collect').key).toBe(original.key);
    expect(() => reservePosOperation('pos:A', { ...payload, tip_amount: 100 }, null, 'collect')).toThrow('pendiente');
    finishPosOperation('pos:A');
    expect(reservePosOperation('pos:A', payload, null, 'collect').key).not.toBe(original.key);
  });
  it('retains the old signature-only key and blocks another restaurant or malformed record', () => {
    const original = reservePosOperation('pos:A', payload, null, 'split');
    sessionStorage.setItem('pos:A:operation', JSON.stringify({ key: original.key, signature: original.signature }));
    expect(readPosOperation('pos:A', 'restaurant-A')?.key).toBe(original.key);
    expect(() => readPosOperation('pos:A', 'restaurant-B')).toThrow('inválido');
    sessionStorage.setItem('pos:A:operation', '{}');
    expect(() => readPosOperation('pos:A', 'restaurant-A')).toThrow('inválido');
  });
  it('does not release a key for unknown, revoked-access or conflicting operations', () => {
    for (const code of [undefined, '42501', '23505', 'PGRST301']) expect(isRolledBackPosError({ code })).toBeFalsy();
    for (const code of ['22023', '23514', 'P0001']) expect(isRolledBackPosError({ code })).toBeTruthy();
  });
  it('storage failure prevents reserving an untraceable request', () => {
    expect(() => reservePosOperation('pos:A', payload, null, 'collect', { getItem: () => null, setItem: () => { throw new Error('storage unavailable'); }, removeItem: () => {} })).toThrow('storage unavailable');
  });
});
