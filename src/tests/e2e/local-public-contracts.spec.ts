import {test,expect} from '@playwright/test';
test.beforeEach(async({context})=>{
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return route.abort('blockedbyclient');
  // Page-specific mocks take precedence. Every unmatched backend request
  // remains offline, including when another local project is running.
  if(url.port==='55421')return route.abort('blockedbyclient');
  return route.continue();
 });
});
test('DSAR fragment removed before confirming; JSON and CSV actually download',async({page})=>{
 let invoked=false;
 await page.route('**/functions/v1/verify-dsar',async route=>{
  invoked=true;expect(route.request().postDataJSON()).toMatchObject({confirm:true,token:'a'.repeat(64)});
  await route.fulfill({headers:{"Access-Control-Allow-Origin":"*"},json:{success:true,status:'fulfilled',request_type:'export',data:{json:{customers:[{name:'Synthetic'}]},csv:'dataset,record\r\ncustomers,Synthetic'}}});
 });
 await page.goto(`/verify-dsar#token=${'a'.repeat(64)}`);
 await expect(page.getByRole('heading',{name:'Solicitud de privacidad'})).toHaveCSS('font-size','24px');
 await expect(page.locator('main')).toHaveCSS('padding-left','32px');
 await expect(page).toHaveURL(/\/verify-dsar$/);expect(invoked).toBe(false);
 await page.getByRole('button',{name:'Confirmar y ejecutar solicitud'}).click();
 const json=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar JSON'}).click();expect((await json).suggestedFilename()).toBe('mis-datos.json');
 const csv=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar CSV'}).click();expect((await csv).suggestedFilename()).toBe('mis-datos.csv');
});
test('Browser paid query does not prove payment or open a session when a receipt is present',async({page})=>{
 await page.route('**/rest/v1/rpc/checkout_receipt',route=>route.fulfill({headers:{"Access-Control-Allow-Origin":"*"},json:{state:'pending',amount:1000,currency:'CLP'}}));
 await page.route('**/rest/v1/rpc/start_table_session_by_qr',()=>{throw new Error('Receipt must not open a new session');});
 await page.goto('/mesa/fixture/pagar?paid=ok#receipt=synthetic-receipt');
 await expect(page.getByText('¡Pago completado!')).toHaveCount(0);
 await expect(page.getByText(/Esperando confirmación del proveedor/)).toBeVisible();
});
test('Incomplete DSAR download survives a reload and retries only the download capability',async({page})=>{
 let calls=0;
 await page.route('**/functions/v1/verify-dsar',async route=>{
  calls++;const input=route.request().postDataJSON();
  if(calls===1){expect(input.token).toBe('b'.repeat(64));await route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'*'},json:{success:false,error:'download_incomplete',requestId:'request',download_token:'c'.repeat(64)}});}
  else{expect(input.token).toBeUndefined();expect(input).toMatchObject({requestId:'request',download_token:'c'.repeat(64),confirm:true});await route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{success:true,status:'fulfilled',request_type:'access',data:{customers:[]}}});}
 });
 await page.goto(`/verify-dsar#token=${'b'.repeat(64)}`);await page.getByRole('button',{name:'Confirmar y ejecutar solicitud'}).click();
 await expect(page.getByRole('button',{name:'Reintentar descarga'})).toBeEnabled();await page.reload();
 await page.getByRole('button',{name:'Reintentar descarga'}).click();await expect(page.getByRole('button',{name:'Descargar JSON'})).toBeVisible();expect(calls).toBe(2);
});
test('Confirmed local receipt alone enables payment success',async({page})=>{
 await page.route('**/rest/v1/rpc/checkout_receipt',route=>route.fulfill({headers:{"Access-Control-Allow-Origin":"*"},json:{state:'confirmed',amount:1000,currency:'CLP'}}));
 await page.goto('/mesa/fixture/pagar#receipt=synthetic-confirmed');
 await expect(page.getByText('¡Pago completado!')).toBeVisible();
});

test('KDS ignores a capability saved for another restaurant and the historical global token',async({page})=>{
 await page.addInitScript(()=>{sessionStorage.setItem('cmor_kds_token','token-A');sessionStorage.setItem('cmor_kds_token:fixture-a','token-A');});
 await page.route('**/rest/v1/restaurants?*',route=>route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{id:'B',name:'Fixture B'}}));
 await page.route('**/rest/v1/rpc/kds_get_restaurant',()=>{throw new Error('A token from another slug must not be sent');});
 await page.goto('/kds/fixture-b');
 await expect(page.getByText('Ingresa el PIN de cocina configurado por el dueño.')).toBeVisible();
 await expect(page.getByText('Fixture A')).toHaveCount(0);
});

test('KDS rejects a valid capability when its restaurant differs from the URL',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('cmor_kds_token:fixture-b','token-A'));
 await page.route('**/rest/v1/restaurants?*',route=>route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{id:'B',name:'Fixture B'}}));
 await page.route('**/rest/v1/rpc/kds_get_restaurant',route=>route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:[{id:'A',name:'Fixture A',default_prep_time:15}]}));
 await page.route('**/rest/v1/rpc/kds_get_orders',()=>{throw new Error('Mismatching restaurant must never fetch orders');});
 await page.goto('/kds/fixture-b');
 await expect(page.getByText('Ingresa el PIN de cocina configurado por el dueño.')).toBeVisible();
 expect(await page.evaluate(()=>sessionStorage.getItem('cmor_kds_token:fixture-b'))).toBeNull();
});
