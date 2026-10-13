> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-004 — Membresías, sucursales y restaurante activo

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-004.
- Objetivo: Membresías, sucursales y restaurante activo dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — REQUIERE VALIDACIÓN.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-004/FR-001, FEAT-004/NFR-001, FEAT-004/SEC-F001 y FEAT-004/EDGE-001.

## Actores

Usuario autenticado con restaurantes; admin.

## Preconditions

Membresía del usuario; UI exige plan habilitado para crear sucursal.

Punto de entrada y trigger: RestaurantSwitcher en /restaurant/*; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | La RPC create_restaurant_branch hereda país, moneda, idioma, impuestos, plan, estado y trial del restaurante primario; ignora parámetros de plan/estado del cliente. | CONFIRMADO | [src/components/RestaurantSwitcher.tsx](<../../../../src/components/RestaurantSwitcher.tsx>); [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260902000001_audit_fixes.sql](<../../../../supabase/migrations/20260902000001_audit_fixes.sql>); [supabase/migrations/20260101000007_multi_restaurant.sql](<../../../../supabase/migrations/20260101000007_multi_restaurant.sql>) |
| FR-002 | El trigger check_max_restaurants rechaza insertar una membresía cuando ya existen 5 para ese perfil. | CONFIRMADO | [src/components/RestaurantSwitcher.tsx](<../../../../src/components/RestaurantSwitcher.tsx>); [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260902000001_audit_fixes.sql](<../../../../supabase/migrations/20260902000001_audit_fixes.sql>); [supabase/migrations/20260101000007_multi_restaurant.sql](<../../../../supabase/migrations/20260101000007_multi_restaurant.sql>) |
| FR-003 | switchRestaurant intenta actualizar profiles.restaurant_id y luego refrescar; el grant posterior sólo permite display_name, por lo que el flujo real REQUIERE VALIDACIÓN. | REQUIERE VALIDACIÓN | [src/components/RestaurantSwitcher.tsx](<../../../../src/components/RestaurantSwitcher.tsx>); [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260902000001_audit_fixes.sql](<../../../../supabase/migrations/20260902000001_audit_fixes.sql>); [supabase/migrations/20260101000007_multi_restaurant.sql](<../../../../supabase/migrations/20260101000007_multi_restaurant.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): La restricción de 5 se implementa con count antes de insertar; no se demuestra serialización de altas concurrentes.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Membresía verificada en is_my_restaurant; no confundir ocultar formulario por plan con enforcement del plan en RPC.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. useAuth resuelve restaurantes de profile_restaurants y el switcher los muestra.
2. Crear sucursal invoca create_restaurant_branch que hereda el primario y crea membresía; el trigger controla conteo.
3. Seleccionar local llama switchRestaurant; ante error de UPDATE conserva estado y registra error; grant actual es incompatible.

## Alternative Flows

Variación específica: Sucursal desde un restaurante activo distinto del primario. La RPC hereda del is_primary=true, aunque comentarios describen el activo.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Sexta asociación secuencial.
- When: Se inserta profile_restaurants.
- Then: El trigger lanza check_violation; concurrencia del límite no está probada.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Usuario sin Auth. When: Se llama create_restaurant_branch. Then: SQL lanza Not authenticated.
- Caso 3 — REQUIERE VALIDACIÓN. Given: Dos altas cuando hay cuatro membresías. When: Se ejecutan simultáneamente. Then: COUNT previo no demuestra serialización; aceptación de quinta/sexta debe validarse en DB aislada.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Sucursal desde un restaurante activo distinto del primario.
- Comportamiento actual: La RPC hereda del is_primary=true, aunque comentarios describen el activo.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/components/RestaurantSwitcher.tsx](<../../../../src/components/RestaurantSwitcher.tsx>); [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260902000001_audit_fixes.sql](<../../../../supabase/migrations/20260902000001_audit_fixes.sql>); [supabase/migrations/20260101000007_multi_restaurant.sql](<../../../../supabase/migrations/20260101000007_multi_restaurant.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| restaurants | DATA-038 |
| profile_restaurants | DATA-030 |
| profiles | DATA-031 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-048, API-055, API-065, API-076, API-103, API-104, API-105, API-109, API-111, API-114, API-131, API-132, API-138, API-162. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-048](../../API_SPEC.md#api-048), [API-055](../../API_SPEC.md#api-055), [API-065](../../API_SPEC.md#api-065), [API-076](../../API_SPEC.md#api-076), [API-103](../../API_SPEC.md#api-103), [API-104](../../API_SPEC.md#api-104), [API-105](../../API_SPEC.md#api-105), [API-109](../../API_SPEC.md#api-109), [API-111](../../API_SPEC.md#api-111), [API-114](../../API_SPEC.md#api-114), [API-131](../../API_SPEC.md#api-131), [API-132](../../API_SPEC.md#api-132), [API-138](../../API_SPEC.md#api-138), [API-162](../../API_SPEC.md#api-162)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Membresía verificada en is_my_restaurant; no confundir ocultar formulario por plan con enforcement del plan en RPC.

Reglas de negocio relacionadas: [BR-004](../../BUSINESS_RULES.md#br-004). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Crea restaurante y asociación dentro de RPC; selección intenta persistir restaurante activo.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: El trigger lanza check_violation; concurrencia del límite no está probada. Fallos parciales/concurrencia: La restricción de 5 se implementa con count antes de insertar; no se demuestra serialización de altas concurrentes. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U11-createRestaurantBranch.test.ts](<../../../../src/tests/unit/U11-createRestaurantBranch.test.ts>)
- [src/tests/unit/U12-branchCreationEmpirical.test.tsx](<../../../../src/tests/unit/U12-branchCreationEmpirical.test.tsx>)
- [src/tests/unit/RestaurantSwitcher.test.tsx](<../../../../src/tests/unit/RestaurantSwitcher.test.tsx>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/components/RestaurantSwitcher.tsx](<../../../../src/components/RestaurantSwitcher.tsx>)
- [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>)
- [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>)
- [supabase/migrations/20260902000001_audit_fixes.sql](<../../../../supabase/migrations/20260902000001_audit_fixes.sql>)
- [supabase/migrations/20260101000007_multi_restaurant.sql](<../../../../supabase/migrations/20260101000007_multi_restaurant.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Seleccionar local llama switchRestaurant; ante error de UPDATE conserva estado y registra error; grant actual es incompatible.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-032](../../BUSINESS_RULES.md#br-032) → FEAT-004/FR-001.

Regla adicional: [BR-041](../../BUSINESS_RULES.md#br-041) → FEAT-004/FR-003.


## Cambio autorizado — 2026-10-06

- [TASK-007 — Sucursales](../../changes/TASK-007.md): FEAT-004/FR-250, FEAT-004/FR-251, FEAT-004/FR-252. Validación local PASS; despliegue UNKNOWN.
- [TASK-012 — Límites e IA](../../changes/TASK-012.md): FEAT-020/FR-300, FEAT-020/FR-301, FEAT-020/FR-302. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
