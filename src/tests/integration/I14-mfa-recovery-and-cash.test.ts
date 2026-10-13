import { describe, it, expect } from 'vitest';
import { actor, anonymous, fixture, service } from './fixtures';
import { fixtureTotp } from '../../../scripts/fixture-totp.mjs';
const checked = <T>(r: { data: T; error: unknown }): T => { expect(r.error).toBeNull(); return r.data; };

describe('MFA recovery and split collection in trusted services', () => {
  it('blocks every old admin JWT during and after service-controlled factor replacement', async () => {
    const db = service(), user = crypto.randomUUID(), email = `${user}@fixture.example.test`, password = `Local-${crypto.randomUUID()}!`;
    const created = await db.auth.admin.createUser({ id: user, email, password, email_confirm: true });
    expect(created.error).toBeNull();
    try {
      checked(await db.from('profiles').update({ role: 'admin' }).eq('id', user).select('id').single());
      const old = anonymous(); expect((await old.auth.signInWithPassword({ email, password })).error).toBeNull();
      const enrolled = checked(await old.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Old synthetic recovery factor' }));
      if (!enrolled || enrolled.type !== 'totp') throw new Error('TOTP fixture missing');
      expect((await old.auth.mfa.challengeAndVerify({ factorId: enrolled.id, code: fixtureTotp(enrolled.totp.secret) })).error).toBeNull();
      expect(checked(await old.rpc('is_admin'))).toBe(true);
      const oldSession = checked(await old.auth.getSession()).session;
      if (!oldSession) throw new Error('Authenticated recovery fixture missing');
      expect((await old.rpc('begin_admin_mfa_recovery', { p_id: user })).error).not.toBeNull();
      checked(await db.rpc('begin_admin_mfa_recovery', { p_id: user }));
      expect(checked(await old.rpc('is_admin'))).toBe(false);
      expect((await db.rpc('complete_admin_mfa_recovery', { p_id: user })).error).not.toBeNull();
      expect((await db.auth.admin.mfa.deleteFactor({ id: enrolled.id, userId: user })).error).toBeNull();
      // JWT iat is an integer second; issue a new challenge strictly after the recovery epoch.
      await new Promise(resolve => setTimeout(resolve, 1100));
      const fresh = anonymous(); expect((await fresh.auth.signInWithPassword({ email, password })).error).toBeNull();
      const replacement = checked(await fresh.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'New synthetic recovery factor' }));
      if (!replacement || replacement.type !== 'totp') throw new Error('Replacement TOTP fixture missing');
      expect((await fresh.auth.mfa.challengeAndVerify({ factorId: replacement.id, code: fixtureTotp(replacement.totp.secret) })).error).toBeNull();
      expect(checked(await fresh.rpc('is_admin'))).toBe(false);
      checked(await db.rpc('complete_admin_mfa_recovery', { p_id: user }));
      expect(checked(await fresh.rpc('is_admin'))).toBe(true);
      // Keep the original access token rather than allowing an automatic refresh to replace it.
      const replay = anonymous(); checked(await replay.auth.setSession(oldSession));
      expect(checked(await replay.rpc('is_admin'))).toBe(false);
    } finally { expect((await db.auth.admin.deleteUser(user)).error).toBeNull(); }
  });

  it('records split tips once, aggregates methods exactly and closes independently of kitchen completion', async () => {
    const db = service(), owner = await actor('ownerB'), id = fixture.restaurants.B;
    // Integration suites are serial; close a prior test shift explicitly instead of deleting history.
    const existing = checked(await db.from('cash_shifts').select('id').eq('restaurant_id', id).eq('status', 'open'));
    for (const row of existing) checked(await owner.rpc('close_cash_shift', { p_shift_id: row.id, p_actual_cash: 0 }));
    const opens = await Promise.all([1, 2].map(() => owner.rpc('open_cash_shift', { p_restaurant_id: id, p_opening_cash: 100 })));
    const shift = checked(opens[0]); expect(checked(opens[1]).id).toBe(shift.id);
    const key = crypto.randomUUID(), input = { p_restaurant_id: id, p_key: key, p_order: {
      items: [{ menu_item_id: fixture.menu.B, quantity: 1 }], tip_amount: 101,
      split_parts: [{ amount: 551, payment_method: 'cash' }, { amount: 550, payment_method: 'card' }],
    } };
    const order = checked(await owner.rpc('write_pos_order', input));
    expect(order).toMatchObject({ status: 'accepted', payment_status: 'paid', total: 1000, tip_amount: 101, cash_shift_id: shift.id });
    expect(checked(await owner.rpc('write_pos_order', input)).id).toBe(order.id);
    const payments = checked(await db.from('order_payments').select('amount,tip_amount,includes_tip,payment_method').eq('order_id', order.id).order('payment_number'));
    expect(payments).toEqual([
      { amount: 551, tip_amount: 51, includes_tip: true, payment_method: 'cash' },
      { amount: 550, tip_amount: 50, includes_tip: true, payment_method: 'card' },
    ]);
    expect(checked(await owner.rpc('can_close_split_order', { p_order_id: order.id }))).toBe(true);
    const metrics = checked(await owner.rpc('cash_shift_metrics', { p_shift_id: shift.id }));
    expect(metrics).toMatchObject({ total: 1000, count: 1, cash: 500, card: 500, total_tips: 101, cash_tips: 51, card_tips: 50 });
    expect((await (await actor('ownerA')).rpc('cash_shift_metrics', { p_shift_id: shift.id })).error).not.toBeNull();
    expect((await owner.from('cash_shifts').update({ total_sales: 0 }).eq('id', shift.id)).error).not.toBeNull();
    const closed = checked(await owner.rpc('close_cash_shift', { p_shift_id: shift.id, p_actual_cash: 651 }));
    expect(closed).toMatchObject({ status: 'closed', cash_sales: 500, card_sales: 500, total_tips: 101, expected_cash: 651, cash_difference: 0 });
    expect(checked(await owner.rpc('close_cash_shift', { p_shift_id: shift.id, p_actual_cash: 0 })).actual_cash).toBe(651);
    const badKey = crypto.randomUUID();
    expect((await owner.rpc('write_pos_order', { ...input, p_key: badKey, p_order: { ...input.p_order, split_parts: [{ amount: 1000, payment_method: 'cash' }] } })).error).not.toBeNull();
    expect(checked(await db.from('order_operations').select('operation_key').eq('operation_key', badKey))).toHaveLength(0);
  });
});
