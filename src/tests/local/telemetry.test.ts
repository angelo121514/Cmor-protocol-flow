import {describe,it,expect} from 'vitest';
import {redactTelemetry,sensitiveRoute} from '../../utils/telemetry';
describe('Telemetry minimization',()=>{
 it('redacts nested capabilities, free text, email, sensitive paths and errors',()=>{
  const data=redactTelemetry({token:'verification-secret',nested:{pin_hash:'hash',message:'a@fixture.test /mesa/qr-private?token=private#receipt=cap',error:new Error('Bearer private-jwt')},list:[{email:'subject@fixture.test'}]});
  for(const secret of ['verification-secret','qr-private','private-jwt','subject@fixture.test','pin_hash":"hash'])expect(JSON.stringify(data)).not.toContain(secret);
 });
 it('suppresses telemetry for sensitive pages, including SPA navigation',()=>{
  for(const path of ['/verify-dsar','/verify-dsar/legacy','/mesa/qr/pagar','/setup-password','/admin/security/mfa','/login'])expect(sensitiveRoute(path)).toBe(true);
  expect(sensitiveRoute('/restaurant/reports')).toBe(false);
 });
});
