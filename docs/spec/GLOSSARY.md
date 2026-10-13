> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Glosario del dominio

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

Definiciones AS-IS reconstruidas; referencias de implementación en spec/catálogos. Ambigüedades se conservan.

| Término | Definición/contexto y código | Sinónimos/ambigüedad |
|---|---|---|
| Restaurante | Fila restaurants, unidad de ownership y configuración; useAuth/is_my_restaurant | Local, tenant; no equivale a organización física multi-local |
| Sucursal | Nuevo restaurante asociado a perfil; create_restaurant_branch hereda primario | Branch/local; primario no siempre es activo |
| Perfil | Rol y restaurante seleccionado vinculados a auth.users; profiles | Usuario no equivale a fila legacy users |
| Membresía | Asociación profile_restaurants que permite acceso al local | is_primary define principal, no selección actual |
| Owner | Rol de perfil propietario; _shared/authorization | RequireRole owner permite otros perfiles asociados; no es enforcement idéntico |
| Staff | Rol de profile | Diferente de rol waiter/head_waiter/cashier en waiters |
| Mesero | Persona atribuida a pedidos/propinas por PIN y sesión | Waiter; no es cuenta Auth necesariamente |
| KDS | Pantalla de cocina, interna o pública con token; kdsService | PIN cocina distinto de PIN mesero |
| Carta/plato | menu_items con precio, disponibilidad, tamaños y addons | Menú/item; snapshot de pedido no es plato vivo |
| Pedido | orders con estado operativo, items y pago; create_order | Orden/order; completed no equivale sólo a ready |
| Cuenta de mesa | Suma de pedidos de una table_session | Sesión de consumo; distinta de sesión Auth |
| Token QR | qr_token de restaurant_tables para resolver mesa | No equivale a session_token ni access_token |
| Session token | Capability de table_sessions para consultar/crear/pagar | Vida/alcance distinto a JWT y token cocina |
| Access token de pedido | UUID de un uso, 24h, get_my_order | No es access token JWT de Supabase |
| Pago confirmado | payment_status=paid en pedido; provider concilia intenciones | Marca manual POS y confirmación externa son rutas distintas |
| Intención de pago | payment_intents registra referencia/importe/proveedor | authorized no equivale a mero retorno navegador |
| Propina | tips, atribución/collected/paid_out | Cobrar al cliente diferente de liquidar al mesero |
| Caja/turno | cash_shifts con fondo, cobros y diferencia | Ruta cash es Pos; componente CashShift está embebido |
| Inventario/insumo | inventory_items y movimientos | Stock clamp no garantiza exactitud histórica del ledger |
| Receta | recipes y recipe_ingredients, consumo por plato | Ausencia de receta no bloquea necesariamente venta |
| Trial | free_trial, plazo declarado actual 14 días | SQL histórico 15/30 días no es plazo actual |
| Lifetime | Plan de pago único de por vida en catálogo | No recurrente; enterprise/test_plan son otros vocablos históricos/técnicos |
| País y moneda efectiva | restaurants.country/currency/tax_rate | Sugerencia regional no es régimen fiscal legal |
| Precio bruto | Total ya incluye impuesto; subtotal=total/(1+tasa) | IVA/IGV etiquetan desglose, no se suma de nuevo |
| DSAR | Solicitud de derechos en data_subject_requests | Titular declarado por email no siempre verificado |
| Scope/purpose | Consent scope enum y purpose textual | Ejecutores usan ambos de manera diferente; no sinónimos garantizados |
| DPO | Contacto/operador de privacidad representado por páginas y docs | Función humana no confirmada en organigrama |
| DTE | Documento tributario emitido por motor externo | 39 boleta, 33 factura, 61 nota de crédito; estado accepted del motor |
| Referencia externa | Clave de correlación comercial/integración | Distinta de request_id/dte_id/folio y nonce |
| Idempotency-Key | Reutilizable para misma operación/body en motor | Nonce se renueva por petición; no reutilizar ambos indiscriminadamente |
| Audit log | Registro de acciones append-only para app roles | No garantiza autenticidad de actor si inserción pública |
| Realtime mirror | orders_events con snapshot del cambio | Evento técnico, no catálogo formal de domain events |
| Mock | Cliente local de tests/legacy | No está activo como fallback de producción en supabase.ts actual |

Fuentes: [DOMAIN_MODEL](DOMAIN_MODEL.md), [DATA_MODEL](DATA_MODEL.md), [FEATURES](FEATURES.md), [API_SPEC](API_SPEC.md).


## Cambio autorizado — términos

LOCAL_IMPLEMENTATION: presente en checkout, no certifica ejecución. REQUIRES VALIDATION: prueba confiable/operación pendiente. reconcile: resultado incierto bloquea repetición externa. AAL2: nivel MFA Auth/JWT más factor activo. browser_signal: observación no confiable. shortage: consumo que no pudo descontarse del stock.
