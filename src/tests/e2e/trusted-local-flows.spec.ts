import {test,expect,type BrowserContext} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import type {Session} from '@supabase/supabase-js';
import {actor,adminAal2,anonymous,fixture,service} from '../integration/fixtures';
import {fixtureTotp} from '../../../scripts/fixture-totp.mjs';

if(!['127.0.0.1','localhost','[::1]'].includes(new URL(fixture.url).hostname))throw new Error('Remote browser fixtures rejected.');
const storageKey=`sb-${new URL(fixture.url).hostname.split('.')[0]}-auth-token`;
async function authenticate(context:BrowserContext,name:string){
  const db=await actor(name),session=(await db.auth.getSession()).data.session;
  if(!session)throw new Error('Real local Auth session is required.');
  if(name!=='admin'){
    const consent=await db.rpc('record_my_consent',{p_scope:'cookies',p_purpose:'Synthetic browser fixture',p_legal_basis:'contract',p_granted:true,p_policy_version:'local-fixture',p_via:'first_login_modal'});
    expect(consent.error).toBeNull();
  }
  await context.addInitScript(({key,session}:{key:string;session:Session})=>localStorage.setItem(key,JSON.stringify(session)),{key:storageKey,session});
  return db;
}
test.beforeEach(async({context})=>{
  await context.route('**/*',route=>{
    const hostname=new URL(route.request().url()).hostname;
    return ['localhost','127.0.0.1','[::1]'].includes(hostname)?route.continue():route.abort('blockedbyclient');
  });
});

test('new admin enrolls and verifies a real TOTP factor through the UI',async({page,context})=>{
  const db=service(),id=crypto.randomUUID(),email=`browser-${id}@fixture.example.test`,password=`Local-${crypto.randomUUID()}!`;
  expect((await db.auth.admin.createUser({id,email,password,email_confirm:true})).error).toBeNull();
  try {
    expect((await db.from('profiles').update({role:'admin'}).eq('id',id).select('id').single()).error).toBeNull();
    const caller=anonymous(),login=await caller.auth.signInWithPassword({email,password});
    expect(login.error).toBeNull();if(!login.data.session)throw new Error('Enrollment actor fixture missing.');
    await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:storageKey,session:login.data.session});
    await page.goto('/admin');await page.getByRole('button',{name:'Configurar autenticador'}).click();
    const secret=await page.locator('code').textContent();if(!secret)throw new Error('Enrollment UI did not provide its setup key.');
    await page.getByLabel('Código de seis dígitos').fill(fixtureTotp(secret));
    await page.getByRole('button',{name:'Verificar',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Verificación en dos pasos'})).toBeHidden();
    const factors=await db.auth.admin.mfa.listFactors({userId:id});expect(factors.error).toBeNull();
    expect(factors.data.factors.some(f=>f.status==='verified')).toBe(true);
  }finally{expect((await db.auth.admin.deleteUser(id)).error).toBeNull();}
});

test('admin AAL1 completes a real TOTP challenge before administrative access',async({page,context})=>{
  const db=await authenticate(context,'admin');await page.goto('/admin');
  await expect(page.getByRole('heading',{name:'Verificación en dos pasos'})).toBeVisible();
  await page.getByLabel('Código de seis dígitos').fill(fixtureTotp(fixture.actors.admin.mfa.secret));
  await page.getByRole('button',{name:'Verificar',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Verificación en dos pasos'})).toBeHidden();
  const previous=await db.rpc('is_admin');expect(previous.error).toBeNull();expect(previous.data).toBe(false);
  // El JWT AAL1 original tampoco permite entrar por una ruta de restaurante.
  await page.goto('/restaurant');
  await expect(page.getByRole('heading',{name:'Verificación en dos pasos'})).toBeVisible();
});

test('owner POS persists kitchen then collection as accepted/paid and remains tenant scoped',async({page,context})=>{
  const db=await authenticate(context,'ownerA');await page.goto('/restaurant/pos');
  await expect(page.getByText('Fixture dish A',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Fixture dish B',{exact:true})).toHaveCount(0);
  await page.getByText('Fixture dish A',{exact:true}).first().click();
  const creating=page.waitForResponse(r=>r.url().endsWith('/rpc/write_pos_order')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'A Cocina',exact:true}).click();
  const kitchen=await creating;expect(kitchen.ok()).toBe(true);const order=await kitchen.json();expect(order.id).toBeTruthy();
  expect(order).toMatchObject({status:'accepted',payment_status:'pending',restaurant_id:fixture.restaurants.A});
  const collecting=page.waitForResponse(r=>r.url().endsWith('/rpc/write_pos_order')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Pagar',exact:true}).click();
  const paid=await collecting;expect(paid.ok()).toBe(true);expect(await paid.json()).toMatchObject({id:order.id,status:'accepted',payment_status:'paid'});
  await expect(page.getByText('Pago registrado. El pedido está en preparación.')).toBeVisible();
  const stored=await db.from('orders').select('status,payment_status,total').eq('id',order.id).single();expect(stored.error).toBeNull();expect(stored.data).toMatchObject({status:'accepted',payment_status:'paid',total:1000});
  const other=await actor('ownerB');expect((await other.from('orders').select('id').eq('id',order.id)).data).toEqual([]);
});

test('failed POS response preserves the cart, prints no receipt and survives reload for reconciliation',async({page,context})=>{
  await authenticate(context,'ownerA');await page.addInitScript(()=>{window.print=()=>{sessionStorage.setItem("fixture-print-count",String(Number(sessionStorage.getItem("fixture-print-count")||0)+1));};});
  await page.goto('/restaurant/pos');await page.getByText('Fixture dish A',{exact:true}).first().click();
  await page.route('**/rest/v1/rpc/write_pos_order',route=>route.abort('failed'));
  await page.getByRole('button',{name:'Pagar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Resolver operación pendiente'})).toBeVisible();
  await expect(page.getByText('Pago registrado. El pedido está en preparación.')).toHaveCount(0);
  expect(await page.evaluate(()=>sessionStorage.getItem('fixture-print-count'))).toBeNull();
  await page.reload();await expect(page.getByRole('button',{name:'Resolver operación pendiente'})).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('fixture-print-count'))).toBeNull();
  await page.unroute('**/rest/v1/rpc/write_pos_order');
  const resolving=page.waitForResponse(r=>r.url().endsWith('/rpc/write_pos_order')&&r.request().method()==='POST');
  // Completion may print only after the persisted result; replace the negative spy.
  await page.evaluate(()=>{window.print=()=>{};});
  await page.getByRole('button',{name:'Resolver operación pendiente'}).click();
  expect((await resolving).ok()).toBe(true);await expect(page.getByRole('button',{name:'Resolver operación pendiente'})).toHaveCount(0);
});

test('branch creation inherits the primary plan and switching isolates the POS draft',async({page,context})=>{
  const owner=await authenticate(context,'ownerA'),db=service(),name=`Browser branch ${crypto.randomUUID()}`;
  let branch:string|undefined;
  try{
    await page.goto('/restaurant/pos');await page.getByText('Fixture dish A',{exact:true}).first().click();
    await page.getByRole('button',{name:'Fixture A',exact:true}).click();
    await page.getByRole('button',{name:'Agregar sucursal'}).click();
    await page.getByRole('textbox',{name:'Nombre',exact:true}).fill(name);await page.getByRole('textbox',{name:'Email',exact:true}).fill('branch@fixture.example.test');
    await page.getByRole('textbox',{name:'Teléfono',exact:true}).fill('+56900000000');
    const creating=page.waitForResponse(r=>r.url().endsWith('/rpc/create_restaurant_branch')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Crear Sucursal',exact:true}).click();
    const response=await creating;expect(response.ok()).toBe(true);branch=await response.json();
    await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
    await expect(page.getByText('Fixture dish A',{exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Pagar',exact:true})).toBeDisabled();
    const stored=await db.from('restaurants').select('subscription_plan,country,currency,slug').eq('id',branch).single();expect(stored.error).toBeNull();
    expect(stored.data).toMatchObject({subscription_plan:'pro',country:'CL',currency:'CLP'});expect(stored.data?.slug).toMatch(/^branch-/);
    await page.getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'Fixture A',exact:true}).click();
    await expect(page.getByText('Fixture dish A',{exact:true}).first()).toBeVisible();
    await expect(page.getByRole('button',{name:'Pagar',exact:true})).toBeEnabled();
  }finally{
    expect((await owner.rpc('switch_restaurant',{p_restaurant_id:fixture.restaurants.A})).error).toBeNull();
    if(branch)expect((await db.from('restaurants').delete().eq('id',branch)).error).toBeNull();
  }
});

test('split collection persists CRM and tips, then closes cash while kitchen work remains accepted',async({page,context})=>{
  const owner=await actor('ownerA'),db=service(),name=`Browser cash ${crypto.randomUUID()}`;
  const result=await owner.rpc('create_restaurant_branch',{p_name:name,p_email:'cash@fixture.example.test',p_phone:'+56900000000',p_city:null,p_address:null,p_restaurant_type:'other',p_subscription_plan:'pro',p_status:'active',p_is_active:true});
  expect(result.error).toBeNull();const branch=result.data as string,menu=crypto.randomUUID();
  try{
    expect((await db.from('menu_items').insert({id:menu,restaurant_id:branch,name:'Browser split dish',base_price:1000,is_available:true})).error).toBeNull();
    expect((await owner.rpc('create_waiter',{p_restaurant_id:branch,p_name:'Browser cashier',p_pin:'4928'})).error).toBeNull();
    const staff=await db.from('waiters').select('id').eq('restaurant_id',branch).single();expect(staff.error).toBeNull();
    expect((await owner.rpc('switch_restaurant',{p_restaurant_id:branch})).error).toBeNull();
    await authenticate(context,'ownerA');await page.addInitScript(()=>{window.print=()=>{};});await page.goto('/restaurant/pos');
    await page.getByText('Sin turno de caja abierto',{exact:true}).click();
    await page.getByLabel('Trabajador responsable',{exact:true}).selectOption(staff.data!.id);
    await page.getByLabel('Fondo inicial (efectivo)',{exact:true}).fill('100');
    await page.getByRole('button',{name:'Abrir caja',exact:true}).click();await expect(page.getByRole('button',{name:'Cerrar turno',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Volver al POS',exact:true}).click();await page.getByText('Browser split dish',{exact:true}).first().click();
    await page.getByText('Opciones del pedido',{exact:true}).click();await page.getByRole('button',{name:'+ Nuevo Cliente',exact:true}).click();
    const customer=`Browser customer ${crypto.randomUUID()}`;
    await page.getByLabel(/Nombre del Cliente/).fill(customer);await page.getByLabel(/Teléfono/).fill(`+569${Date.now().toString().slice(-8)}`);
    await page.getByRole('button',{name:'Guardar Cliente',exact:true}).click();
    await page.getByRole('button',{name:'Dividir Cuenta',exact:true}).click();await page.getByLabel('Medio de pago Persona 2',{exact:true}).selectOption('card');
    const paying=page.waitForResponse(r=>r.url().endsWith('/rpc/write_pos_order')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Confirmar división',exact:true}).click();const paid=await paying;expect(paid.ok()).toBe(true);const order=await paid.json();
    expect(order).toMatchObject({restaurant_id:branch,status:'accepted',payment_status:'paid',is_split:true,total:1000,tip_amount:100});
    await page.getByText('Turno abierto',{exact:true}).click();await page.getByRole('button',{name:'Cerrar turno',exact:true}).click();
    await page.getByLabel('Conteo real de efectivo',{exact:true}).fill('650');await page.getByRole('button',{name:'Confirmar cierre',exact:true}).click();
    await expect(page.getByText('El turno se cerró correctamente.',{exact:true})).toBeVisible();
    const cash=await db.from('cash_shifts').select('status,total_sales,total_tips,expected_cash,cash_difference').eq('restaurant_id',branch).single();expect(cash.error).toBeNull();
    expect(cash.data).toMatchObject({status:'closed',total_sales:1000,total_tips:100,expected_cash:650,cash_difference:0});
    await page.goto('/restaurant/crm');await expect(page.getByRole('heading',{name:customer,exact:true})).toBeVisible();
    await expect(page.getByText('1 pedidos pagados',{exact:true})).toBeVisible();
    expect((await db.from('orders').select('status').eq('id',order.id).single()).data?.status).toBe('accepted');
  }finally{
    expect((await owner.rpc('switch_restaurant',{p_restaurant_id:fixture.restaurants.A})).error).toBeNull();
    expect((await db.from('order_operations').delete().eq('restaurant_id',branch)).error).toBeNull();
    // Orders reference the cash shift: remove only this synthetic scope in
    // dependency order instead of relying on sibling cascade ordering.
    expect((await db.from('orders').delete().eq('restaurant_id',branch)).error).toBeNull();
    expect((await db.from('restaurants').delete().eq('id',branch)).error).toBeNull();
  }
});


test('downloads a real report for 1251 paid orders without max_rows truncation or CSV formulas',async({page,context})=>{
 const owner=await actor('ownerA'),db=service(),id=crypto.randomUUID();
 expect((await db.from('restaurants').insert({id,name:'Browser report',slug:id,email:'report@fixture.example.test',phone:'+56900000000',status:'active',subscription_plan:'pro',country:'CL',currency:'CLP',is_active:true})).error).toBeNull();
 expect((await db.from('profile_restaurants').insert({profile_id:fixture.actors.ownerA.id,restaurant_id:id,is_primary:false})).error).toBeNull();
 try{
  const rows=Array.from({length:1252},(_,i)=>({id:crypto.randomUUID(),restaurant_id:id,order_number:`BROWSER-${i}`,order_type:'counter',items:[{name:'=FORMULA()',quantity:1,item_total:1000}],total:1000,subtotal:840,tax:160,status:'accepted',payment_status:i===1251?'pending':'paid'}));
  for(let i=0;i<rows.length;i+=400)expect((await db.from('orders').insert(rows.slice(i,i+400))).error).toBeNull();
  expect((await owner.rpc('switch_restaurant',{p_restaurant_id:id})).error).toBeNull();await authenticate(context,'ownerA');
  await page.goto('/restaurant/reports');await expect(page.getByRole('heading',{name:'Reportes e Informes de Ventas',exact:true})).toBeVisible();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV',exact:true}).click();
  const file=await download;expect(file.suggestedFilename()).toBe('reporte-ventas-30-dias.csv');const path=await file.path();if(!path)throw new Error('Report was not downloaded.');
  const csv=await readFile(path,'utf8');expect(csv).toContain('"Pedidos Totales","1251"');expect(csv).toContain('"\'=FORMULA()","1251"');
  const report=await owner.rpc('restaurant_sales_report',{p_restaurant_id:id,p_days:30});expect(report.error).toBeNull();expect(report.data).toMatchObject({totalRevenue:1251000,totalOrders:1251});
 }finally{
  expect((await owner.rpc('switch_restaurant',{p_restaurant_id:fixture.restaurants.A})).error).toBeNull();
  expect((await db.from('orders').delete().eq('restaurant_id',id)).error).toBeNull();expect((await db.from('restaurants').delete().eq('id',id)).error).toBeNull();
 }
});

test('billing UI paginates 1251 payments and invoices, rejects foreign rows and shows load failures',async({page,context})=>{
 const owner=await actor('ownerA'),db=service(),id=crypto.randomUUID(),customer=crypto.randomUUID(),subscription=crypto.randomUUID(),plan=crypto.randomUUID();
 expect((await db.from('restaurants').insert({id,name:'Browser billing',slug:id,email:'billing@fixture.example.test',phone:'+56900000000',status:'active',subscription_plan:'pro',country:'CL',currency:'CLP',is_active:true})).error).toBeNull();
 expect((await db.from('profile_restaurants').insert({profile_id:fixture.actors.ownerA.id,restaurant_id:id,is_primary:false})).error).toBeNull();
 try{
  expect((await db.from('flow_plans').insert({id:plan,name:'Browser plan',amount:98000,currency:'CLP',interval:3})).error).toBeNull();
  expect((await db.from('flow_customers').insert({id:customer,restaurant_id:id,email:'billing@fixture.example.test',name:'Billing fixture'})).error).toBeNull();
  expect((await db.from('flow_subscriptions').insert({id:subscription,customer_id:customer,plan_id:plan,status:1})).error).toBeNull();
  const base=Date.now()*1000,payments=Array.from({length:1251},(_,i)=>({id:crypto.randomUUID(),restaurant_id:id,subscription_id:subscription,flow_order:base+i,commerce_order:`BILL-${i}`,amount:98000,status:2}));
  const invoices=Array.from({length:1251},(_,i)=>({id:`BILL-${id}-${i}`,subscription_id:subscription,amount:98000,currency:'CLP',status:'paid',due_date:new Date().toISOString()}));
  for(let i=0;i<1251;i+=400){expect((await db.from('flow_payments').insert(payments.slice(i,i+400))).error).toBeNull();expect((await db.from('flow_invoices').insert(invoices.slice(i,i+400))).error).toBeNull();}
  expect((await owner.rpc('switch_restaurant',{p_restaurant_id:id})).error).toBeNull();await authenticate(context,'ownerA');await page.goto('/restaurant/subscription');
  const paid=page.getByRole('table',{name:'Historial de Pagos'}),billed=page.getByRole('table',{name:'Facturas de Suscripción'});
  await expect(paid.locator('tbody tr')).toHaveCount(1251,{timeout:30000});await expect(billed.locator('tbody tr')).toHaveCount(1251,{timeout:30000});
  const other=await actor('ownerB');expect((await other.from('flow_payments').select('id').eq('restaurant_id',id)).data).toEqual([]);
  expect((await other.from('flow_invoices').select('id').eq('subscription_id',subscription)).data).toEqual([]);
   expect((await other.from('flow_subscriptions').select('id,customer_id').eq('id',subscription)).data).toEqual([]);
   expect((await owner.from('flow_subscriptions').select('*').eq('id',subscription)).error).not.toBeNull();
  await page.route('**/rest/v1/flow_payments?*',route=>route.fulfill({status:503,json:{message:'Synthetic history failure'}}));
  await page.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(page.getByText('No se pudo cargar el historial de facturación. Intenta nuevamente.',{exact:true})).toBeVisible();
  await expect(paid.locator('tbody tr')).toHaveCount(0);await expect(page.getByText('No se registran transacciones de pago.',{exact:true})).toHaveCount(0);
 }finally{
  expect((await owner.rpc('switch_restaurant',{p_restaurant_id:fixture.restaurants.A})).error).toBeNull();
  expect((await db.from('flow_subscriptions').delete().eq('id',subscription)).error).toBeNull();expect((await db.from('restaurants').delete().eq('id',id)).error).toBeNull();expect((await db.from('flow_plans').delete().eq('id',plan)).error).toBeNull();
 }
});


test('admin configures client operations with real MFA, manual print attestation and validated timezone',async({page,context})=>{
 const admin=await adminAal2(),db=service(),original=await admin.rpc('get_operational_settings');expect(original.error).toBeNull();
 const prior=(await db.from('restaurants').select('report_timezone').eq('id',fixture.restaurants.A).single()).data?.report_timezone;
 try{
  await authenticate(context,'admin');await page.addInitScript(()=>{window.print=()=>{sessionStorage.setItem('fixture-printed','yes');};});
  await page.goto('/admin/operations');await page.getByLabel('Código de seis dígitos').fill(fixtureTotp(fixture.actors.admin.mfa.secret));await page.getByRole('button',{name:'Verificar',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Configuración de operación',exact:true})).toBeVisible();
  await page.getByLabel('Responsable de seguridad y recuperación MFA',{exact:true}).fill('Synthetic security operator');
  await page.getByLabel('Responsable de privacidad',{exact:true}).fill('Synthetic privacy operator');
  await page.getByLabel('Responsable de conciliación de pagos',{exact:true}).fill('Synthetic payment operator');
  await page.getByLabel('Responsable de contabilidad y DTE',{exact:true}).fill('Synthetic accounting operator');
  await page.getByLabel('Nombre o ubicación de impresora',{exact:true}).fill('Synthetic printer');
  const acknowledgement=page.getByLabel('Confirmo que revisé la impresión física y fue correcta.',{exact:true});await expect(acknowledgement).toBeDisabled();
  await page.getByRole('button',{name:'Imprimir prueba',exact:true}).click();expect(await page.evaluate(()=>sessionStorage.getItem('fixture-printed'))).toBe('yes');await acknowledgement.check();
  await page.getByLabel('He revisado y aprobado el catálogo comercial para esta instalación.',{exact:true}).check();
  await page.getByRole('button',{name:'Guardar configuración',exact:true}).click();await expect(page.getByText('Configuración guardada.',{exact:true})).toBeVisible();
  const saved=await admin.rpc('get_operational_settings');expect(saved.error).toBeNull();expect(saved.data.config).toMatchObject({catalog_approved:true,printer_label:'Synthetic printer',security_owner:'Synthetic security operator'});expect(saved.data.printer_attested_at).toBeTruthy();
  await page.getByLabel('Restaurante',{exact:true}).selectOption(fixture.restaurants.A);await page.getByLabel('Zona horaria IANA',{exact:true}).fill('America/Punta_Arenas');
  await page.getByRole('button',{name:'Guardar zona horaria',exact:true}).click();await expect(page.getByText('Zona horaria guardada.',{exact:true})).toBeVisible();
  expect((await (await actor('ownerA')).rpc('restaurant_sales_report',{p_restaurant_id:fixture.restaurants.A,p_days:1})).data?.timezone).toBe('America/Punta_Arenas');
 }finally{
  const latest=await admin.rpc('get_operational_settings');expect(latest.error).toBeNull();expect((await admin.rpc('save_operational_settings',{p_settings:{...original.data.config,printer_test_confirmed:false},p_revision:latest.data.revision})).error).toBeNull();
  expect((await db.from('restaurants').update({report_timezone:prior??null}).eq('id',fixture.restaurants.A)).error).toBeNull();
 }
});
