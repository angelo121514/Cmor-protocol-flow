> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-009 — Pagos y webhooks

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-015/FR-270** — Reservar intento/referencia antes del proveedor; escritura incierta queda creating/reconcile y no genera otro cobro.
- **FEAT-015/FR-271** — Conciliar referencia, importe, moneda, ID remoto y firma MP obligatoria antes de confirmar transaccionalmente.
- **FEAT-015/FR-272** — Webhook repetido no duplica pedido, propina, stock o cierre; retorno navegador sólo consulta estado.

## Evidencia y trazabilidad

Features: FEAT-002, FEAT-015, FEAT-018. Hallazgos: RISK-006, DEBT-007. Constitución: SEC-007, SEC-009, SEC-010, SEC-011, SEC-012, SEC-013, SEC-015.

Código: [checkout.ts](<../../../supabase/functions/_shared/checkout.ts>); [checkout-runtime.ts](<../../../supabase/functions/_shared/checkout-runtime.ts>); [payment-webhook.ts](<../../../supabase/functions/_shared/payment-webhook.ts>); [provider-operations.ts](<../../../supabase/functions/_shared/provider-operations.ts>); [invitation-delivery.ts](<../../../supabase/functions/_shared/invitation-delivery.ts>); [index.ts](<../../../supabase/functions/flow-customer/index.ts>); [index.ts](<../../../supabase/functions/webhooks/webpay/index.ts>).

Migraciones nuevas: [20261006000008_checkout_reservations.sql](<../../../supabase/migrations/20261006000008_checkout_reservations.sql>); [20261006000009_payment_compatibility.sql](<../../../supabase/migrations/20261006000009_payment_compatibility.sql>); [20261006000017_provider_operations.sql](<../../../supabase/migrations/20261006000017_provider_operations.sql>); [20261006000020_invitation_delivery.sql](<../../../supabase/migrations/20261006000020_invitation_delivery.sql>).

## Contrato, implementación y compatibilidad

Reservar intento/referencia antes del proveedor; escritura incierta queda creating/reconcile y no genera otro cobro. Conciliar referencia, importe, moneda, ID remoto y firma MP obligatoria antes de confirmar transaccionalmente. Webhook repetido no duplica pedido, propina, stock o cierre; retorno navegador sólo consulta estado. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[trusted-handlers.test.ts](<../../../src/tests/local/trusted-handlers.test.ts>); [recovery-contracts.test.ts](<../../../src/tests/local/recovery-contracts.test.ts>); [I12-financial-privacy-limits.test.ts](<../../../src/tests/integration/I12-financial-privacy-limits.test.ts>); [I13-edge-http.test.ts](<../../../src/tests/integration/I13-edge-http.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Proveedores simulados. Confirmar monedas/métodos/catálogo, firma MP y conciliación/outbox con operador antes de habilitar. No prometer exactly-once externo.

## Revisión incremental local

El alta administrativa no ofrece canales SMS/WhatsApp sin implementación. La UI distingue invitación pending de sent; encolar no prueba entrega. [PendingRequests](<../../../src/pages/admin/PendingRequests.tsx>) conserva creación de cuenta y explica la entrega pendiente. Contrato API-236/outbox no cambia.

## Validación con Docker disponible

SQL28 separa remote_status de columnas status en suscripciones/cancelación. La suite HTTP añade MP BRL con firma obligatoria, lectura remota y replay; Webpay consulta/commit/retorno repetido y activación única. El catálogo/método PEN real queda pendiente del operador. Resultados y estados de cierre en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Contrato de suscripciones con runtime

[I17](<../../../src/tests/integration/I17-subscription-runtime.test.ts>) cubre sync de catálogo AAL2, reservas concurrentes de customer, alta/repetición de suscripción y cancelación inmediata repetida sobre SQL/Edge y Flow simulado. Verifica persistencia local y estados confirmed; SQL28 evita la ambigüedad de status. Precios/contratos previos no se reescriben. Evidencia final en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

**FEAT-015/FR-273** — Repetir cancelación de la misma suscripción y modalidad devuelve confirmación persistida, sin nueva llamada al proveedor. SQL30 busca cancelación confirmed por fingerprint bajo bloqueo del restaurante; el handler devuelve response sin efectos adicionales. No deduplica nuevas suscripciones ni nuevas altas de tarjeta. BR-060, API-239, [SQL30](<../../../supabase/migrations/20261006000030_cancel_operation_replay.sql>), I17 y recovery-contracts. Confirmaciones históricas se conservan.


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Proveedores simulados. Confirmar monedas/métodos/catálogo, firma MP y conciliación/outbox con operador antes de habilitar. No prometer exactly-once externo.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Proveedores simulados. Confirmar monedas/métodos/catálogo, firma MP y conciliación/outbox con operador antes de habilitar. No prometer exactly-once externo.
