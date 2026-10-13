> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Catálogo de funcionalidades

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

AS-IS, 2026-10-05. IDs estables para 24 capacidades. Cada spec vinculada contiene objetivo, actores secundarios, trigger, precondiciones, flujos, postcondiciones/efectos, errores, datos, permisos, rutas, API, tablas, código, tests y dependencias. CONFIRMADO local no certifica despliegue ni aprobación de negocio.

| Feature/spec | Nombre | Actores | Entrada | Estado |
| --- | --- | --- | --- | --- |
| [FEAT-001](features/FEAT-001-identidad-sesion/spec.md) | Identidad, sesión e invitaciones | Owner, staff y administrador; Supabase Auth como actor secundario | /login, /admin/login, /setup-password; guards /restaurant/* y /admin/* | CONFIRMADO local |
| [FEAT-002](features/FEAT-002-registro-activacion/spec.md) | Registro, aprobación y activación | Prospecto, administrador; Supabase Auth y proveedor de pagos | /register, /admin/requests | CONFIRMADO local |
| [FEAT-003](features/FEAT-003-administracion/spec.md) | Administración de restaurantes y plataforma | Administrador; dueño como destinatario de invitaciones | /admin, /admin/requests, /admin/restaurants, /admin/analytics | CONFIRMADO local |
| [FEAT-004](features/FEAT-004-sucursales/spec.md) | Membresías, sucursales y restaurante activo | Usuario autenticado con restaurantes; admin | RestaurantSwitcher en /restaurant/* | REQUIERE VALIDACIÓN |
| [FEAT-005](features/FEAT-005-carta-imagenes/spec.md) | Carta, variantes, disponibilidad e imágenes | Owner/staff en panel; cliente como lector | /restaurant/menu, /menu/:slug | CONFIRMADO local |
| [FEAT-006](features/FEAT-006-pedidos-publicos/spec.md) | Pedidos públicos, estados y seguimiento | Cliente anónimo, owner; cocina como consumidor | /menu/:slug, /restaurant/orders | CONFIRMADO local |
| [FEAT-007](features/FEAT-007-pos/spec.md) | POS, cobro manual y envío a cocina | Cajero/owner, mesero identificado por PIN; cocina | /restaurant/pos y alias /restaurant/cash | CONFIRMADO local |
| [FEAT-008](features/FEAT-008-crm/spec.md) | CRM e historial de clientes | Owner/cajero; cliente como titular de datos | /restaurant/crm, selector de cliente en POS | CONFIRMADO local |
| [FEAT-009](features/FEAT-009-reportes/spec.md) | Reportes y analítica de ventas | Owner y admin en analítica de plataforma | /restaurant/reports, /admin/analytics | CONFIRMADO local |
| [FEAT-010](features/FEAT-010-inventario-recetas/spec.md) | Inventario, recetas y movimientos | Owner; pedidos completados como trigger secundario | /restaurant/inventory, editor de recetas en /restaurant/menu | CONFIRMADO local |
| [FEAT-011](features/FEAT-011-meseros-pin/spec.md) | Meseros, PIN y sesiones | Owner, mesero; POS como consumidor de sesión | /restaurant/waiters, WaiterPinPad en POS | CONFIRMADO local |
| [FEAT-012](features/FEAT-012-propinas/spec.md) | Registro y liquidación de propinas | Owner/cajero; mesero beneficiario | POS, /restaurant/reports y pago QR | CONFIRMADO local |
| [FEAT-013](features/FEAT-013-cuentas-divididas/spec.md) | División de cuentas y pagos parciales | Cajero/owner; pagadores como etiquetas | SplitBillModal en POS | CONFIRMADO local |
| [FEAT-014](features/FEAT-014-mesas-sesiones-qr/spec.md) | Mesas, QR y sesiones de consumo | Owner, cliente anónimo; mesero asignado | /restaurant/tables, /mesa/:qrToken, /mesa/:qrToken/pagar | CONFIRMADO local |
| [FEAT-015](features/FEAT-015-pagos-webhooks/spec.md) | Checkout, pago de mesa y conciliación de webhooks | Cliente/prospecto; Flow, Mercado Pago y Transbank | Registro y /mesa/:qrToken/pagar; /payment/error | CONFIRMADO local |
| [FEAT-016](features/FEAT-016-cocina-kds/spec.md) | Pantalla de cocina interna y pública | Owner/staff interno, operador cocina con PIN | /restaurant/kds, /kds/:restaurantSlug | CONFIRMADO local |
| [FEAT-017](features/FEAT-017-turnos-caja/spec.md) | Apertura y cierre de turnos de caja | Owner/cajero; mesero responsable opcional | Panel de caja integrado en POS; /restaurant/cash resuelve Pos | CONFIRMADO local |
| [FEAT-018](features/FEAT-018-suscripciones/spec.md) | Planes, trial, tarjeta y suscripción recurrente | Owner, admin para sincronizar planes; Flow | /restaurant/subscription, /restaurant/settings | CONFIRMADO local |
| [FEAT-019](features/FEAT-019-privacidad-dsar/spec.md) | Consentimientos, derechos y páginas de privacidad | Titular, owner y admin/DPO; Resend y Supabase Auth | /legal/*, /verify-dsar, /restaurant/privacy, /admin/privacy | REQUIERE VALIDACIÓN |
| [FEAT-020](features/FEAT-020-recomendaciones-ia/spec.md) | Recomendaciones de negocio y chatbot local | Owner; OpenRouter/DeepSeek como tercero; cliente del chatbot local | /restaurant/ai; chatbot de carta según montaje | CONFIRMADO local |
| [FEAT-021](features/FEAT-021-configuracion-regional/spec.md) | Configuración del restaurante, países e idiomas | Owner/admin; cliente como consumidor de formato | /restaurant/settings, landing/registro/carta con país/idioma | CONFIRMADO local |
| [FEAT-022](features/FEAT-022-contabilidad-dte/spec.md) | Contabilidad y documentos tributarios Chile | Owner/admin y cron interno; motor cmorflow-tax-api | /restaurant/accounting; accounting/config, emit, sync, documents, credit-note, documents/:id/artifact | CONFIRMADO local |
| [FEAT-023](features/FEAT-023-dashboard-notificaciones/spec.md) | Dashboard y notificaciones operativas | Owner; módulos operativos como productores | /restaurant | CONFIRMADO local |
| [FEAT-024](features/FEAT-024-seguridad-operacion/spec.md) | Incidentes, auditoría y operación | Admin/DPO y workflows; Sentry y Slack configurables | /admin/security; healthcheck; GitHub Actions | CONFIRMADO local |


## Cambio autorizado — cobertura

Las 24 features conservan IDs. Cada spec enlaza tareas/requisitos calificados de corrección. La tabla del baseline es histórica; estados actuales en TASKS. Documentación enlazada no equivale a prueba ni despliegue.


Estado vigente: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), evidencia LOCAL_VALIDATION (referencia histórica excluida de esta distribución).
