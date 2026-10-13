> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Reglas de negocio y operación

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

AS-IS. UI, SQL y servicios pueden contener reglas distintas. Los requisitos adicionales figuran en cada spec; no se consideran políticas deseables los comportamientos inseguros observados.

<a id="br-001"></a>

## BR-001 — Identidad, sesión e invitaciones

- Descripción/resultado: El guard espera la resolución de sesión, redirige anónimos al login y rechaza un perfil ausente o sin restaurante salvo admin.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Sesión válida de Supabase y perfil asociado para paneles; invitación vigente para vincular propietario.

Punto de entrada y trigger: /login, /admin/login, /setup-password; guards /restaurant/* y /admin/*; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Perfil sin restaurante. Se redirige a /login?error=no_restaurant; una sesión Auth por sí sola no abre el panel.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: profiles, profile_restaurants, restaurants, invitations. Feature: [FEAT-001](features/FEAT-001-identidad-sesion/spec.md), FEAT-001/FR-001.
- Evidencia: [src/hooks/useAuth.ts](<../../src/hooks/useAuth.ts>); [src/components/RequireRole.tsx](<../../src/components/RequireRole.tsx>); [src/pages/public/LoginPage.tsx](<../../src/pages/public/LoginPage.tsx>); [src/pages/public/SetupPassword.tsx](<../../src/pages/public/SetupPassword.tsx>); [src/pages/admin/LoginPage.tsx](<../../src/pages/admin/LoginPage.tsx>); [src/config/authClient.ts](<../../src/config/authClient.ts>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-002"></a>

## BR-002 — Registro, aprobación y activación

- Descripción/resultado: RegisterPage crea la solicitud y deriva free_trial a activate-trial-registration; planes pagos pasan a la pasarela correspondiente al país.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Solicitud pending con email del dueño; plan elegido y país válido.

Punto de entrada y trigger: /register, /admin/requests; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Activación repetida de una solicitud ya procesada. La Edge Function no encuentra pending y devuelve 409; la RPC devuelve request_not_found_or_processed.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: registration_requests, restaurants, invitations, payment_intents. Feature: [FEAT-002](features/FEAT-002-registro-activacion/spec.md), FEAT-002/FR-001.
- Evidencia: [src/pages/public/RegisterPage.tsx](<../../src/pages/public/RegisterPage.tsx>); [src/services/adminService.ts](<../../src/services/adminService.ts>); [supabase/functions/activate-trial-registration/index.ts](<../../supabase/functions/activate-trial-registration/index.ts>); [supabase/functions/invite-owner/index.ts](<../../supabase/functions/invite-owner/index.ts>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-003"></a>

## BR-003 — Administración de restaurantes y plataforma

- Descripción/resultado: El listado administrativo usa admin_list_restaurants para acceder a columnas internas protegidas por grants.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Perfil administrativo y permisos RPC efectivos.

Punto de entrada y trigger: /admin, /admin/requests, /admin/restaurants, /admin/analytics; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Cambio de estado con isCurrentlyBlocked=true. El servicio pasa p_is_active=true para reactivar; no interpreta el argumento como estado nuevo.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: restaurants, registration_requests, audit_log, invitations, orders. Feature: [FEAT-003](features/FEAT-003-administracion/spec.md), FEAT-003/FR-001.
- Evidencia: [src/services/adminService.ts](<../../src/services/adminService.ts>); [src/pages/admin/AllRestaurants.tsx](<../../src/pages/admin/AllRestaurants.tsx>); [src/pages/admin/PendingRequests.tsx](<../../src/pages/admin/PendingRequests.tsx>); [src/pages/admin/Analytics.tsx](<../../src/pages/admin/Analytics.tsx>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-004"></a>

## BR-004 — Membresías, sucursales y restaurante activo

- Descripción/resultado: La RPC create_restaurant_branch hereda país, moneda, idioma, impuestos, plan, estado y trial del restaurante primario; ignora parámetros de plan/estado del cliente.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Membresía del usuario; UI exige plan habilitado para crear sucursal.

Punto de entrada y trigger: RestaurantSwitcher en /restaurant/*; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Sucursal desde un restaurante activo distinto del primario. La RPC hereda del is_primary=true, aunque comentarios describen el activo.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: restaurants, profile_restaurants, profiles. Feature: [FEAT-004](features/FEAT-004-sucursales/spec.md), FEAT-004/FR-001.
- Evidencia: [src/components/RestaurantSwitcher.tsx](<../../src/components/RestaurantSwitcher.tsx>); [src/hooks/useAuth.ts](<../../src/hooks/useAuth.ts>); [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>); [supabase/migrations/20260902000001_audit_fixes.sql](<../../supabase/migrations/20260902000001_audit_fixes.sql>); [supabase/migrations/20260101000007_multi_restaurant.sql](<../../supabase/migrations/20260101000007_multi_restaurant.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-005"></a>

## BR-005 — Carta, variantes, disponibilidad e imágenes

- Descripción/resultado: El servicio crea, edita, elimina platos y alterna is_available; CustomerMenu recibe cambios de menu_items por Realtime.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Restaurante accesible para edición; público según policies de menú.

Punto de entrada y trigger: /restaurant/menu, /menu/:slug; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Precio cero en formulario. Menu exige formData.base_price truthy y no acepta cero mediante ese formulario.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: menu_items, menu_categories, recipes, recipe_ingredients. Feature: [FEAT-005](features/FEAT-005-carta-imagenes/spec.md), FEAT-005/FR-001.
- Evidencia: [src/pages/restaurant/Menu.tsx](<../../src/pages/restaurant/Menu.tsx>); [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>); [src/components/ImageDropZone.tsx](<../../src/components/ImageDropZone.tsx>); [supabase/migrations/20260101000004_trial_limits.sql](<../../supabase/migrations/20260101000004_trial_limits.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-006"></a>

## BR-006 — Pedidos públicos, estados y seguimiento

- Descripción/resultado: create_order recalcula precio de carta, tamaño y addons; total es suma de items y subtotal=total/(1+tax_rate).
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Restaurante activo/trial vigente, carrito con productos disponibles.

Punto de entrada y trigger: /menu/:slug, /restaurant/orders; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Segunda lectura del mismo access_token. La primera lectura lo borra; la siguiente produce P0002, aunque el TTL todavía esté vigente.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: orders, orders_events, menu_items, restaurant_customers, feature_flags, rate_limits. Feature: [FEAT-006](features/FEAT-006-pedidos-publicos/spec.md), FEAT-006/FR-001.
- Evidencia: [src/pages/customer/CustomerMenu.tsx](<../../src/pages/customer/CustomerMenu.tsx>); [src/pages/restaurant/Orders.tsx](<../../src/pages/restaurant/Orders.tsx>); [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>); [supabase/migrations/20260831000001_multi_country.sql](<../../supabase/migrations/20260831000001_multi_country.sql>); [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql](<../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-007"></a>

## BR-007 — POS, cobro manual y envío a cocina

- Descripción/resultado: El POS bloquea doble envío local mientras orderSubmitting está activo y muestra éxito optimista con snapshots para revertir ante fallo.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Restaurante activo, carrito no vacío; número de mesa obligatorio para order_type=table.

Punto de entrada y trigger: /restaurant/pos y alias /restaurant/cash; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Cambio de sucursal con borrador POS. La clave única no está asociada a restaurant_id; preservación/cruce de carrito REQUIERE VALIDACIÓN y revalidación server-side de productos.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: orders, restaurant_customers, tips, order_payments, cash_shifts. Feature: [FEAT-007](features/FEAT-007-pos/spec.md), FEAT-007/FR-001.
- Evidencia: [src/pages/restaurant/Pos.tsx](<../../src/pages/restaurant/Pos.tsx>); [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>); [src/hooks/useWaiterSession.ts](<../../src/hooks/useWaiterSession.ts>); [src/components/SplitBillModal.tsx](<../../src/components/SplitBillModal.tsx>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-008"></a>

## BR-008 — CRM e historial de clientes

- Descripción/resultado: getCustomers combina clientes persistidos con pedidos de los últimos 90 días por teléfono, sin duplicar IDs de pedidos.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Usuario con acceso al restaurante; nombre y teléfono para vínculo automático.

Punto de entrada y trigger: /restaurant/crm, selector de cliente en POS; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Pedido con teléfono pero sin fila CRM. Se expone un cliente sintético; ese id no equivale a UUID persistido válido para UPDATE.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: restaurant_customers, orders. Feature: [FEAT-008](features/FEAT-008-crm/spec.md), FEAT-008/FR-001.
- Evidencia: [src/pages/restaurant/Crm.tsx](<../../src/pages/restaurant/Crm.tsx>); [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-009"></a>

## BR-009 — Reportes y analítica de ventas

- Descripción/resultado: Las métricas de ventas usan get_daily_sales, get_top_items, get_avg_ticket, get_sales_by_hour, get_sales_by_order_type y get_reports_summary.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Restaurante accesible y rango de fechas seleccionado.

Punto de entrada y trigger: /restaurant/reports, /admin/analytics; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Día límite de un rango y zona horaria distinta. Hay cálculos de inicio de día en navegador y agrupaciones SQL; equivalencia entre zonas REQUIERE VALIDACIÓN.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: orders, tips, inventory_items, waiters, cash_shifts. Feature: [FEAT-009](features/FEAT-009-reportes/spec.md), FEAT-009/FR-001.
- Evidencia: [src/pages/restaurant/Reports.tsx](<../../src/pages/restaurant/Reports.tsx>); [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../supabase/migrations/20260710000008_notifications_usage.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-010"></a>

## BR-010 — Inventario, recetas y movimientos

- Descripción/resultado: adjust_inventory_stock modifica stock e inserta movimiento en una RPC, valida ownership y rechaza stock negativo.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Insumo/receta del restaurante; delta y tipo de movimiento para ajustes.

Punto de entrada y trigger: /restaurant/inventory, editor de recetas en /restaurant/menu; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Consumo de receta mayor que stock. Stock queda en 0; el cálculo RETURNING current_stock+v_needed infiere stock anterior y puede registrar más descuento que el real (RISK-007).

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: inventory_items, recipes, recipe_ingredients, inventory_movements, orders. Feature: [FEAT-010](features/FEAT-010-inventario-recetas/spec.md), FEAT-010/FR-001.
- Evidencia: [src/services/inventoryService.ts](<../../src/services/inventoryService.ts>); [src/pages/restaurant/Inventory.tsx](<../../src/pages/restaurant/Inventory.tsx>); [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql](<../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql>); [supabase/migrations/20260710000001_inventory.sql](<../../supabase/migrations/20260710000001_inventory.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-011"></a>

## BR-011 — Meseros, PIN y sesiones

- Descripción/resultado: Crear y actualizar meseros usa RPCs; los PIN se hashean en SQL y el listado de servicio excluye pin_hash.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Acceso al restaurante; PIN y mesero activo para validar sesión.

Punto de entrada y trigger: /restaurant/waiters, WaiterPinPad en POS; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Edición de mesero sin nuevo PIN. El cliente envía p_pin=null y conserva el hash anterior según rama RPC.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: waiters, waiter_sessions, orders. Feature: [FEAT-011](features/FEAT-011-meseros-pin/spec.md), FEAT-011/FR-001.
- Evidencia: [src/services/waiterService.ts](<../../src/services/waiterService.ts>); [src/hooks/useWaiterSession.ts](<../../src/hooks/useWaiterSession.ts>); [src/pages/restaurant/Waiters.tsx](<../../src/pages/restaurant/Waiters.tsx>); [supabase/migrations/20260710000002_waiters.sql](<../../supabase/migrations/20260710000002_waiters.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-012"></a>

## BR-012 — Registro y liquidación de propinas

- Descripción/resultado: calculateTipAmount retorna 0 si total o porcentaje no es positivo; usa Math.round con decimales de moneda.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Permisos del restaurante y monto/porcentaje de propina.

Punto de entrada y trigger: POS, /restaurant/reports y pago QR; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Misma propina porcentual fraccionaria en POS y QR. POS usa round; calcTipFromPercent QR usa ceil. La diferencia es comportamiento actual, no una regla monetaria uniforme.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: tips, orders, waiters. Feature: [FEAT-012](features/FEAT-012-propinas/spec.md), FEAT-012/FR-001.
- Evidencia: [src/services/tipsService.ts](<../../src/services/tipsService.ts>); [src/services/tableService.ts](<../../src/services/tableService.ts>); [supabase/migrations/20260710000003_tips.sql](<../../supabase/migrations/20260710000003_tips.sql>).
- Test de regla: U15-tipsService (helper local).

<a id="br-013"></a>

## BR-013 — División de cuentas y pagos parciales

- Descripción/resultado: splitEqually divide con Math.floor y devuelve resto separado; people<=0 devuelve partes vacías y remainder=total.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Pedido accesible y partes/montos elegidos.

Punto de entrada y trigger: SplitBillModal en POS; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: División de moneda con centavos. Math.floor y tolerancia 1 no se ajustan a decimales; el comportamiento puede diferir de repartir centavos (RISK-008).

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: order_payments, orders. Feature: [FEAT-013](features/FEAT-013-cuentas-divididas/spec.md), FEAT-013/FR-001.
- Evidencia: [src/services/splitBillService.ts](<../../src/services/splitBillService.ts>); [src/components/SplitBillModal.tsx](<../../src/components/SplitBillModal.tsx>); [supabase/migrations/20260710000004_split_bills.sql](<../../supabase/migrations/20260710000004_split_bills.sql>).
- Test de regla: U16-splitBill (helper local).

<a id="br-014"></a>

## BR-014 — Mesas, QR y sesiones de consumo

- Descripción/resultado: El owner gestiona mesas y puede regenerar qr_token usando crypto.randomUUID.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Mesa y restaurante activos; token QR para lookup público y session_token para pedidos.

Punto de entrada y trigger: /restaurant/tables, /mesa/:qrToken, /mesa/:qrToken/pagar; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Mesa durante payment_pending. create_table_order no encuentra sesión active y retorna invalid_session; start_table_session sólo busca active y podría crear otra sesión.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: restaurant_tables, table_sessions, orders. Feature: [FEAT-014](features/FEAT-014-mesas-sesiones-qr/spec.md), FEAT-014/FR-001.
- Evidencia: [src/services/tableService.ts](<../../src/services/tableService.ts>); [src/pages/customer/TableQR.tsx](<../../src/pages/customer/TableQR.tsx>); [src/pages/restaurant/Tables.tsx](<../../src/pages/restaurant/Tables.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../supabase/migrations/20260831000001_multi_country.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-015"></a>

## BR-015 — Checkout, pago de mesa y conciliación de webhooks

- Descripción/resultado: order-pay recalcula suma de pedidos no cancelled/rejected y limita propina a 100%; CL usa Flow, BR/PE Mercado Pago, BO rechaza pago online.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Intención/solicitud o sesión válida; proveedor configurado.

Punto de entrada y trigger: Registro y /mesa/:qrToken/pagar; /payment/error; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Repetir order-pay con sesión payment_pending. El handler la acepta; no hay claim local previo a crear Flow. En MP idempotency key depende de ORDP-session.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: payment_intents, flow_payments, flow_webhook_events, table_sessions, orders, tips, registration_requests. Feature: [FEAT-015](features/FEAT-015-pagos-webhooks/spec.md), FEAT-015/FR-001.
- Evidencia: [supabase/functions/order-pay/index.ts](<../../supabase/functions/order-pay/index.ts>); [supabase/functions/flow-checkout/index.ts](<../../supabase/functions/flow-checkout/index.ts>); [supabase/functions/mp-checkout/index.ts](<../../supabase/functions/mp-checkout/index.ts>); [supabase/functions/mp-webhook/index.ts](<../../supabase/functions/mp-webhook/index.ts>); [supabase/functions/create-payment-intent/index.ts](<../../supabase/functions/create-payment-intent/index.ts>); [supabase/functions/webhooks/flow/index.ts](<../../supabase/functions/webhooks/flow/index.ts>); [supabase/functions/webhooks/webpay/index.ts](<../../supabase/functions/webhooks/webpay/index.ts>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-016"></a>

## BR-016 — Pantalla de cocina interna y pública

- Descripción/resultado: kitchen_login valida PIN de 4 a 32 caracteres, hashea/verifica en SQL y emite token de 12 horas.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Sesión owner para KDS interno o PIN de cocina para token público.

Punto de entrada y trigger: /restaurant/kds, /kds/:restaurantSlug; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Nuevo login de cocina con PIN correcto. Sobrescribe el token único del restaurante; el token anterior deja de coincidir.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: restaurants, orders, orders_events, rate_limits. Feature: [FEAT-016](features/FEAT-016-cocina-kds/spec.md), FEAT-016/FR-001.
- Evidencia: [src/services/kdsService.ts](<../../src/services/kdsService.ts>); [src/pages/customer/KDSPublic.tsx](<../../src/pages/customer/KDSPublic.tsx>); [src/pages/restaurant/KDS.tsx](<../../src/pages/restaurant/KDS.tsx>); [supabase/migrations/20260807020000_harden_public_kds_access.sql](<../../supabase/migrations/20260807020000_harden_public_kds_access.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-017"></a>

## BR-017 — Apertura y cierre de turnos de caja

- Descripción/resultado: open_cash_shift devuelve turno abierto existente sin duplicar en flujo secuencial; el responsable se pasa como waiter_id opcional.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Restaurante accesible; fondo inicial o conteo final y turno válido.

Punto de entrada y trigger: Panel de caja integrado en POS; /restaurant/cash resuelve Pos; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Cerrar otra vez con conteo diferente. La RPC devuelve el cierre existente, no vuelve a ajustar diferencia.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: cash_shifts, orders, tips, waiters. Feature: [FEAT-017](features/FEAT-017-turnos-caja/spec.md), FEAT-017/FR-001.
- Evidencia: [src/services/cashShiftService.ts](<../../src/services/cashShiftService.ts>); [src/pages/restaurant/CashShift.tsx](<../../src/pages/restaurant/CashShift.tsx>); [src/pages/restaurant/Pos.tsx](<../../src/pages/restaurant/Pos.tsx>); [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-018"></a>

## BR-018 — Planes, trial, tarjeta y suscripción recurrente

- Descripción/resultado: Catálogo comercial expone free_trial, starter, pro y lifetime; lifetime es pago único y no recurrente.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Owner con acceso al restaurante; Flow configurado y plan permitido.

Punto de entrada y trigger: /restaurant/subscription, /restaurant/settings; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Oferta, moneda y precio por país frente a plan Flow. Precios regionales y catálogo Flow/Webpay no constituyen una única fuente; conciliación requiere validación de configuración externa.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: restaurants, flow_plans, flow_customers, flow_subscriptions, flow_payments, flow_invoices. Feature: [FEAT-018](features/FEAT-018-suscripciones/spec.md), FEAT-018/FR-001.
- Evidencia: [src/hooks/useFlowSubscription.ts](<../../src/hooks/useFlowSubscription.ts>); [src/services/flowService.ts](<../../src/services/flowService.ts>); [src/pages/restaurant/Subscription.tsx](<../../src/pages/restaurant/Subscription.tsx>); [src/config/config.ts](<../../src/config/config.ts>); [supabase/functions/flow-customer/index.ts](<../../supabase/functions/flow-customer/index.ts>); [supabase/functions/flow-subscription/index.ts](<../../supabase/functions/flow-subscription/index.ts>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-019"></a>

## BR-019 — Consentimientos, derechos y páginas de privacidad

- Descripción/resultado: Access/erase validan JWT del mismo email o crean pending_verification y envían token; verify-dsar exige token de al menos 32 caracteres y TTL 24h.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Email y payload según derecho; prueba de identidad sólo implementada en determinados handlers.

Punto de entrada y trigger: /legal/*, /verify-dsar, /restaurant/privacy, /admin/privacy; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Verificación simultánea o ejecución parcialmente fallida. La secuencia marca in_progress, ejecuta, marca fulfilled y borra token con llamadas separadas; no se demuestra claim atómico.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: consents, data_subject_requests, audit_log, restaurant_customers, orders, restaurants, invitations. Feature: [FEAT-019](features/FEAT-019-privacidad-dsar/spec.md), FEAT-019/FR-001.
- Evidencia: [src/services/privacyService.ts](<../../src/services/privacyService.ts>); [supabase/functions/privacy-access/index.ts](<../../supabase/functions/privacy-access/index.ts>); [supabase/functions/privacy-erase/index.ts](<../../supabase/functions/privacy-erase/index.ts>); [supabase/functions/privacy-export/index.ts](<../../supabase/functions/privacy-export/index.ts>); [supabase/functions/privacy-object/index.ts](<../../supabase/functions/privacy-object/index.ts>); [supabase/functions/privacy-rectify/index.ts](<../../supabase/functions/privacy-rectify/index.ts>); [supabase/functions/privacy-revoke-consent/index.ts](<../../supabase/functions/privacy-revoke-consent/index.ts>); [supabase/functions/verify-dsar/index.ts](<../../supabase/functions/verify-dsar/index.ts>); [src/components/privacy/ConsentManager.tsx](<../../src/components/privacy/ConsentManager.tsx>); [src/components/privacy/CookieBanner.tsx](<../../src/components/privacy/CookieBanner.tsx>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-020"></a>

## BR-020 — Recomendaciones de negocio y chatbot local

- Descripción/resultado: La Edge valida JWT y membresía y analiza máximo 500 pedidos completed de últimos 30 días junto con carta/inventario/propinas.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: JWT, membresía y OPENROUTER_API_KEY; datos de restaurante disponibles.

Punto de entrada y trigger: /restaurant/ai; chatbot de carta según montaje; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: 11 solicitudes concurrentes antes de registrar uso. Conteo y registro son operaciones separadas; no hay reserva de cuota atómica observable.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: ai_usage_log, orders, menu_items, inventory_items, tips, profile_restaurants. Feature: [FEAT-020](features/FEAT-020-recomendaciones-ia/spec.md), FEAT-020/FR-001.
- Evidencia: [src/services/aiService.ts](<../../src/services/aiService.ts>); [src/pages/restaurant/AiRecommendations.tsx](<../../src/pages/restaurant/AiRecommendations.tsx>); [supabase/functions/ai-recommendations/index.ts](<../../supabase/functions/ai-recommendations/index.ts>); [src/components/AiChatbot.tsx](<../../src/components/AiChatbot.tsx>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-021"></a>

## BR-021 — Configuración del restaurante, países e idiomas

- Descripción/resultado: Los países disponibles son CL, BR, BO y PE; país desconocido en getRegionalConfig/getPlanPrices usa CL.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Configuración accesible; country/currency/language válidos.

Punto de entrada y trigger: /restaurant/settings, landing/registro/carta con país/idioma; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: tax_rate=-1 o valor fuera de régimen. Columna NUMERIC(5,4) no prueba un CHECK de rango; SQL divide por 1+tax_rate y trigger rechaza ciertos importes, configuración debe validarse humanamente.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: restaurants, registration_requests, menu_items. Feature: [FEAT-021](features/FEAT-021-configuracion-regional/spec.md), FEAT-021/FR-001.
- Evidencia: [src/config/regional.ts](<../../src/config/regional.ts>); [src/config/config.ts](<../../src/config/config.ts>); [src/utils/helpers.ts](<../../src/utils/helpers.ts>); [src/i18n/panelI18n.tsx](<../../src/i18n/panelI18n.tsx>); [src/pages/restaurant/RestaurantSettings.tsx](<../../src/pages/restaurant/RestaurantSettings.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../supabase/migrations/20260831000001_multi_country.sql>).
- Test de regla: U22-regional-config (helper local).

<a id="br-022"></a>

## BR-022 — Contabilidad y documentos tributarios Chile

- Descripción/resultado: Emite boleta 39/factura 33 de pedido pagado; factura requiere receiver.rut válido y name; nota de crédito 61 requiere documento accepted del mismo restaurante.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Restaurante CL, orden paid para emitir, credencial configurada y master key para cifrar.

Punto de entrada y trigger: /restaurant/accounting; accounting/config, emit, sync, documents, credit-note, documents/:id/artifact; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Emisión externa exitosa seguida de timeout antes de request_id local. Sync busca por externalReference y, si no existe en motor, reemite con la misma key; resultado desplegado requiere validación.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: accounting_config, accounting_documents, accounting_cron_secret, orders, restaurants. Feature: [FEAT-022](features/FEAT-022-contabilidad-dte/spec.md), FEAT-022/FR-001.
- Evidencia: [src/services/accountingService.ts](<../../src/services/accountingService.ts>); [src/pages/restaurant/Accounting.tsx](<../../src/pages/restaurant/Accounting.tsx>); [src/utils/accounting.ts](<../../src/utils/accounting.ts>); [supabase/functions/accounting/index.ts](<../../supabase/functions/accounting/index.ts>); [supabase/functions/_shared/accounting-payload.ts](<../../supabase/functions/_shared/accounting-payload.ts>); [supabase/functions/_shared/tax-client.ts](<../../supabase/functions/_shared/tax-client.ts>); [supabase/functions/_shared/tax-signing.ts](<../../supabase/functions/_shared/tax-signing.ts>); [supabase/migrations/20260905000001_accounting_module.sql](<../../supabase/migrations/20260905000001_accounting_module.sql>); [supabase/migrations/20260906000001_accounting_grant_hardening.sql](<../../supabase/migrations/20260906000001_accounting_grant_hardening.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-023"></a>

## BR-023 — Dashboard y notificaciones operativas

- Descripción/resultado: Dashboard agrega pedidos, meseros, mesas, stock, turno y propinas; sólo completed+paid contribuye a ingresos del día.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Restaurante activo en contexto y permisos de lectura.

Punto de entrada y trigger: /restaurant; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Más de 1000 pedidos en consulta sin paginación. totalOrders y agregados derivados pueden estar truncados por max_rows local=1000; no representan necesariamente toda la historia.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: notifications, orders, waiters, restaurant_tables, inventory_items, cash_shifts, tips. Feature: [FEAT-023](features/FEAT-023-dashboard-notificaciones/spec.md), FEAT-023/FR-001.
- Evidencia: [src/services/dashboardService.ts](<../../src/services/dashboardService.ts>); [src/pages/restaurant/RestaurantHome.tsx](<../../src/pages/restaurant/RestaurantHome.tsx>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../supabase/migrations/20260710000008_notifications_usage.sql>).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.

<a id="br-024"></a>

## BR-024 — Incidentes, auditoría y operación

- Descripción/resultado: Security permite registrar incidentes con estados detected/investigating/contained/notified/closed y consultar auditoría/anomalías.
- Estado: CONFIRMADO local; REQUIERE VALIDACIÓN donde lo indique el texto.
- Origen/condiciones: Admin para UI; secretos de workflows/DSN para integraciones operativas.

Punto de entrada y trigger: /admin/security; healthcheck; GitHub Actions; acción del actor en pantalla o llamada del consumidor indicado.
- Excepciones: Variación específica: Acciones de anomalías sin productores. El conteo cero no distingue falta de instrumentación de ausencia real de abuso; export_data no coincide con dsar_export_fulfilled.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.
- Entidades: breach_register, audit_log, restaurants. Feature: [FEAT-024](features/FEAT-024-seguridad-operacion/spec.md), FEAT-024/FR-001.
- Evidencia: [src/services/securityService.ts](<../../src/services/securityService.ts>); [src/pages/admin/Security.tsx](<../../src/pages/admin/Security.tsx>); [src/instrumentation.ts](<../../src/instrumentation.ts>); [src/utils/logger.ts](<../../src/utils/logger.ts>); [supabase/functions/healthcheck/index.ts](<../../supabase/functions/healthcheck/index.ts>); [.github/workflows/ci.yml](<../../.github/workflows/ci.yml>); .github/workflows/backup.yml (referencia histórica excluida de esta distribución); [.github/workflows/monitor.yml](<../../.github/workflows/monitor.yml>); .github/workflows/healthcheck.yml (referencia histórica excluida de esta distribución).
- Test de regla: MISSING; pruebas relacionadas no prueban automáticamente esta regla.


## Constraints y reglas distribuidas adicionales

<a id="br-025"></a>

### BR-025

- Descripción, condiciones y resultado: Cantidad de item entero 1–100; otras cantidades rechazan por trigger.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql:7](<../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql#L7>), validate_public_order_write.
- Entidad/feature: FEAT-006/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-026"></a>

### BR-026

- Descripción, condiciones y resultado: Carrito con 1–50 líneas en RPC; vacío/más de 50 retorna error.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260831000001_multi_country.sql:19](<../../supabase/migrations/20260831000001_multi_country.sql#L19>), create_order.
- Entidad/feature: FEAT-006/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-027"></a>

### BR-027

- Descripción, condiciones y resultado: completed requiere payment_status=paid; estampa paid_at/completed_at.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:15](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L15>), enforce_order_payment_integrity.
- Entidad/feature: FEAT-006/FR-001, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-028"></a>

### BR-028

- Descripción, condiciones y resultado: Precio bruto total; subtotal=total/(1+tax_rate), impuesto=total-subtotal.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260831000001_multi_country.sql:19](<../../supabase/migrations/20260831000001_multi_country.sql#L19>), create_order/create_table_order.
- Entidad/feature: FEAT-021/FR-003, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-029"></a>

### BR-029

- Descripción, condiciones y resultado: Lifetime es pago único y no suscripción recurrente UI.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [src/config/config.ts:15](<../../src/config/config.ts#L15>), APP_CONFIG.plans.lifetime.
- Entidad/feature: FEAT-018/FR-001, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-030"></a>

### BR-030

- Descripción, condiciones y resultado: Trial nuevo dura 14 días; invitación nueva 7 días.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260831000001_multi_country.sql:21](<../../supabase/migrations/20260831000001_multi_country.sql#L21>), auto_approve_registration_v2.
- Entidad/feature: FEAT-002/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-031"></a>

### BR-031

- Descripción, condiciones y resultado: Ajuste atómico valida owner/tipo y rechaza stock negativo.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql:5](<../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql#L5>), adjust_inventory_stock.
- Entidad/feature: FEAT-010/FR-001, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-032"></a>

### BR-032

- Descripción, condiciones y resultado: Sucursal hereda restaurante primario, no parámetros plan/estado/active del caller.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260902000001_audit_fixes.sql:7](<../../supabase/migrations/20260902000001_audit_fixes.sql#L7>), create_restaurant_branch.
- Entidad/feature: FEAT-004/FR-001, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-033"></a>

### BR-033

- Descripción, condiciones y resultado: Deducción clampa cero; fórmula de movimiento conserva consumo solicitado al faltar stock.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql:88](<../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql#L88>), _deduct_inventory_for_order_internal.
- Entidad/feature: FEAT-010/FR-003, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-034"></a>

### BR-034

- Descripción, condiciones y resultado: Propina POS redondea nearest y QR hacia arriba, según decimales.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [src/services/tipsService.ts:127](<../../src/services/tipsService.ts#L127>), calculateTipAmount; tableService.calcTipFromPercent.
- Entidad/feature: FEAT-012/FR-001, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-035"></a>

### BR-035

- Descripción, condiciones y resultado: Borrador POS clave única y TTL 12h; QR usa slug y TTL 4h.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [src/pages/restaurant/Pos.tsx:87](<../../src/pages/restaurant/Pos.tsx#L87>), pos_cart_draft; CustomerMenu.qr_cart_draft.
- Entidad/feature: FEAT-007/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-036"></a>

### BR-036

- Descripción, condiciones y resultado: get_my_order anula token tras lectura y exige creación dentro de últimas 24h.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:283](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L283>), get_my_order.
- Entidad/feature: FEAT-006/FR-003, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-037"></a>

### BR-037

- Descripción, condiciones y resultado: start_table_session concede sesión existente active por table_id.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:355](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L355>), start_table_session.
- Entidad/feature: FEAT-014/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-038"></a>

### BR-038

- Descripción, condiciones y resultado: Credencial cifrada AES-GCM ligada por AAD al restaurant_id.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/functions/accounting/index.ts:98](<../../supabase/functions/accounting/index.ts#L98>), encryptTaxSecret/decryptTaxSecret.
- Entidad/feature: FEAT-022/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-039"></a>

### BR-039

- Descripción, condiciones y resultado: Factura 33 requiere receptor RUT/name y orden pagada; NC sobre documento accepted.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/functions/accounting/index.ts:12](<../../supabase/functions/accounting/index.ts#L12>), emit/credit-note.
- Entidad/feature: FEAT-022/FR-001, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-040"></a>

### BR-040

- Descripción, condiciones y resultado: Object/revoke scopes enumerados, revocan por email sin identidad observada.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/functions/privacy-object/index.ts:27](<../../supabase/functions/privacy-object/index.ts#L27>), VALID_SCOPES/handler.
- Entidad/feature: FEAT-019/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-041"></a>

### BR-041

- Descripción, condiciones y resultado: profiles autenticado sólo permite UPDATE display_name según hardening.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/migrations/20260828000001_audit_lock_sensitive_columns.sql:32](<../../supabase/migrations/20260828000001_audit_lock_sensitive_columns.sql#L32>), GRANT UPDATE.
- Entidad/feature: FEAT-004/FR-003, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-042"></a>

### BR-042

- Descripción, condiciones y resultado: Cuota IA 10/24h, fail-open si falla contador.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/functions/ai-recommendations/index.ts:77](<../../supabase/functions/ai-recommendations/index.ts#L77>), isWithinAiRateLimit.
- Entidad/feature: FEAT-020/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-043"></a>

### BR-043

- Descripción, condiciones y resultado: POS espera id pero create_order retorna order_id y pending/pending.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [src/services/restaurantService.ts:277](<../../src/services/restaurantService.ts#L277>), createOrderViaRpc; Pos.handlePlaceOrder.
- Entidad/feature: FEAT-007/FR-003, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-044"></a>

### BR-044

- Descripción, condiciones y resultado: Sync contable lease 45s; cron cada 5m y presupuesto por lotes.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [supabase/functions/accounting/index.ts:464](<../../supabase/functions/accounting/index.ts#L464>), syncRestaurant/LEASE_SECONDS.
- Entidad/feature: FEAT-022/FR-003, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-045"></a>

### BR-045

- Descripción, condiciones y resultado: listAnomalies cuenta actions por ventana; threshold no aplicado en servicio.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [src/services/securityService.ts:125](<../../src/services/securityService.ts#L125>), listAnomalies.
- Entidad/feature: FEAT-024/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.

<a id="br-046"></a>

### BR-046

- Descripción, condiciones y resultado: Guardar receta reemplaza ingredientes sin transacción cliente única.
- Certeza: CONFIRMADO de implementación; expectativa de negocio/producción REQUIERE VALIDACIÓN donde interviene RISK.
- Origen/ubicación: [src/services/inventoryService.ts:112](<../../src/services/inventoryService.ts#L112>), saveRecipe.
- Entidad/feature: FEAT-010/FR-002, datos de su spec.
- Excepciones: estados/fallos y variantes de esa feature; no corregir AS-IS al documentar.
- Test de regla: MISSING de cadena completa; helpers relacionados están en TESTING.



## Cambio autorizado — reglas aprobadas

| ID | Regla | Tarea |
| --- | --- | --- |
| BR-047 | Stock insuficiente permite venta;descontar min(stock,consumo),faltante separado y marca única | TASK-010 |
| BR-048 | Cobro POS accepted/paid;terminación aparte;completed implica paid | TASK-006 |
| BR-049 | Admin perfil/AAL2/factor activo;service no es admin humano | TASK-003 |
| BR-050 | QR válido comparte cuenta;UUID no autoriza;sesión única abierta/enpago | TASK-008 |
| BR-051 | Unidades mínimas,mitad arriba;partes suman total bruto | TASK-011 |
| BR-052 | DSAR identidad verificada;rectificación revisión admin name/phone;sin fulfilled parcial | TASK-004 |
| BR-053 | Reserva precede proveedor;incertidumbre bloquea repetición y requiere reconciliar | TASK-009 |
| BR-054 | IA externa ai_disabled sin efectos;asistente local conservado | TASK-012 |
| BR-055 | Membresías5/platos30trial/cantidad100/líneas50 validados atómicamente | TASK-012 |
| BR-056 | Consulta fallida error visible;SQL métricas y listados paginados | TASK-013 |

- **BR-057** — Partes POS suman precio bruto más propina exacta. Restos mayores distribuyen su componente de propina; venta por medio excluye ese componente y efectivo esperado lo agrega una sola vez. Caja cuenta pagos aceptados sin exigir entrega. Evidencia: migraciones06/23, API-220/API-243, DATA-057, FEAT-013/FR-244 y FEAT-017/FR-243; TASK-006; prueba I14 y navegador PASS local.

- **BR-058** — Catálogo y opciones conservan precisión nativa; carrito acumula unidades mínimas y conversión sólo presenta. Pedido nuevo captura moneda; NULL histórico no se inventa; cambio de moneda con pedidos se bloquea hasta reconciliación. TASK-011, DATA-058, FEAT-021/FR-293, SQL24; runtime local PASS.

- **BR-059** — Ningún PIN puede seleccionar arbitrariamente a un mesero. Altas/cambios concurrentes se serializan por restaurante y rechazan PIN en uso, incluso de meseros inactivos. Duplicados históricos se conservan y fallan al validar hasta rotación explícita por owner. FEAT-011/FR-213, API-245, TASK-003, SQL29, S06.

- **BR-060** — Cancelación repetida identifica subscription_id + at_period_end y devuelve resultado confirmed. Operación creating/reconcile sigue bloqueada; cambiar modalidad requiere operación distinta. No reutilizar una alta de suscripción cancelada como si fuera un contrato nuevo. FEAT-015/FR-273 / API-239 / TASK-009 / SQL30 / I17.


Estado vigente: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), evidencia LOCAL_VALIDATION (referencia histórica excluida de esta distribución).

## Reglas TASK-016

BR-061: los responsables y aprobaciones se configuran por administrador AAL2; un contacto no otorga permisos y una confirmación manual no demuestra hardware ni proveedor. BR-062: snapshots vencen24h; solicitudes no se eliminan sin política opt-in explícita, y conservación legal/estados recuperables bloquean su purga.

## BR-063 — Inspección obligatoria antes de Storage

CONFIRMADO en `menu-image/index.ts`, `inspectImage` y `services/image-inspector/inspector.py`: nueva subida exige decodificación completa, límites y antivirus real vigente; ausencia/fallo bloquea. Canonización PNG elimina metadatos. Configuración y salud desplegadas REQUIERE VALIDACIÓN por administrador. Pruebas: I13, image-inspection y test_scanner. FEAT-024/FR-346; TASK-016; SEC-007/008/014.

## BR-064 — Publicación de imagen por su restaurante

GET menu-image firma únicamente una ruta cuya carpeta restaurant_id coincide con la fila publicada que autoriza su lectura. Publicar desde un tenant ajeno no concede acceso. Storage deniega INSERT/UPDATE cliente; sólo el servicio inspeccionado escribe. FEAT-024/FR-348; API-234; TASK-016; I13. Firmas legacy existentes del proveedor requieren inventario y procedimiento operativo separado.
