import {describe,it,expect} from 'vitest';
import {installationOrigins} from '../../../supabase/functions/_shared/installation';
import {TaxApiClient,TaxApiError} from '../../../supabase/functions/_shared/tax-client';
describe('Independent installation configuration',()=>{
  it('uses only configured HTTPS origins in a hosted installation',()=>{
    expect(installationOrigins('https://restaurant.example.test','https://admin.example.test,https://restaurant.example.test/'))
      .toEqual(['https://restaurant.example.test','https://admin.example.test']);
  });
  it('defaults to local browser origins and rejects wildcard, credentials and path origins',()=>{
    expect(installationOrigins()).toContain('http://localhost:5173');
    expect(installationOrigins('http://localhost:5173')).toEqual(['http://localhost:5173','http://127.0.0.1:5173']);
    for(const origin of ['*','https://*.example.test','http://remote.example.test','https://user:password@example.test','https://example.test/app','https://example.test/?token=x'])
      expect(()=>installationOrigins(origin)).toThrow();
  });
  it('does not construct a tax provider client without an explicit endpoint',()=>{
    expect(()=>new TaxApiClient({baseUrl:'',apiKey:'synthetic',secret:'synthetic'})).toThrow(TaxApiError);
  });
});
