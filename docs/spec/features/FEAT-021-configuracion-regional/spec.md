> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-021 — Configuración del restaurante, países e idiomas

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-021.
- Objetivo: Configuración del restaurante, países e idiomas dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-021/FR-001, FEAT-021/NFR-001, FEAT-021/SEC-F001 y FEAT-021/EDGE-001.

## Actores

Owner/admin; cliente como consumidor de formato.

## Preconditions

Configuración accesible; country/currency/language válidos.

Punto de entrada y trigger: /restaurant/settings, landing/registro/carta con país/idioma; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | Los países disponibles son CL, BR, BO y PE; país desconocido en getRegionalConfig/getPlanPrices usa CL. | CONFIRMADO | [src/config/regional.ts](<../../../../src/config/regional.ts>); [src/config/config.ts](<../../../../src/config/config.ts>); [src/utils/helpers.ts](<../../../../src/utils/helpers.ts>); [src/i18n/panelI18n.tsx](<../../../../src/i18n/panelI18n.tsx>); [src/pages/restaurant/RestaurantSettings.tsx](<../../../../src/pages/restaurant/RestaurantSettings.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>) |
| FR-002 | CL sugiere CLP/es/0.19 y Flow; BR BRL/pt/tasa inicial 0, PE PEN/es/0.18 y MP; BO BOB/es/0.13 y manual. | CONFIRMADO | [src/config/regional.ts](<../../../../src/config/regional.ts>); [src/config/config.ts](<../../../../src/config/config.ts>); [src/utils/helpers.ts](<../../../../src/utils/helpers.ts>); [src/i18n/panelI18n.tsx](<../../../../src/i18n/panelI18n.tsx>); [src/pages/restaurant/RestaurantSettings.tsx](<../../../../src/pages/restaurant/RestaurantSettings.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>) |
| FR-003 | El restaurante guarda configuración efectiva; Settings convierte tasa porcentual a fracción y SQL usa tax_rate para pedidos con precio bruto. | CONFIRMADO | [src/config/regional.ts](<../../../../src/config/regional.ts>); [src/config/config.ts](<../../../../src/config/config.ts>); [src/utils/helpers.ts](<../../../../src/utils/helpers.ts>); [src/i18n/panelI18n.tsx](<../../../../src/i18n/panelI18n.tsx>); [src/pages/restaurant/RestaurantSettings.tsx](<../../../../src/pages/restaurant/RestaurantSettings.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>) |
| FR-004 | El panel conserva idioma elegido en cmor-panel-lang; carta usa default_language y traducciones de platos cuando disponibles. | CONFIRMADO | [src/config/regional.ts](<../../../../src/config/regional.ts>); [src/config/config.ts](<../../../../src/config/config.ts>); [src/utils/helpers.ts](<../../../../src/utils/helpers.ts>); [src/i18n/panelI18n.tsx](<../../../../src/i18n/panelI18n.tsx>); [src/pages/restaurant/RestaurantSettings.tsx](<../../../../src/pages/restaurant/RestaurantSettings.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Compatibilidad CL preservada por tests regionales; number y redondeo en fronteras monetarias, sin equivalencia exacta universal entre módulos.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Settings limita UI pero grants permiten columnas regionales; país/impuestos no son dictamen jurídico ni verificación de régimen fiscal.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Owner modifica configuración de país/moneda/idioma/tasa en Settings.
2. Se persiste configuración efectiva; defaults regionales y tipos/constraints delimitan valores.
3. Carta/POS/panel y SQL consumen moneda/tasa/idioma; proveedor online se deriva por país en rutas concretas.

## Alternative Flows

Variación específica: tax_rate=-1 o valor fuera de régimen. Columna NUMERIC(5,4) no prueba un CHECK de rango; SQL divide por 1+tax_rate y trigger rechaza ciertos importes, configuración debe validarse humanamente.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: country fuera de CL/BR/BO/PE en solicitud.
- When: Se inserta con constraint final.
- Then: La base rechaza por registration_requests_country_check.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: País desconocido o null en helper. When: Se consulta getRegionalConfig. Then: Usa DEFAULT_COUNTRY CL; esto no cambia constraint SQL de country.
- Caso 3 — CONFIRMADO. Given: Moneda permitida distinta de sugerida por país. When: Owner persiste config. Then: País sugiere defaults; no existe invariante universal país=moneda.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: tax_rate=-1 o valor fuera de régimen.
- Comportamiento actual: Columna NUMERIC(5,4) no prueba un CHECK de rango; SQL divide por 1+tax_rate y trigger rechaza ciertos importes, configuración debe validarse humanamente.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/config/regional.ts](<../../../../src/config/regional.ts>); [src/config/config.ts](<../../../../src/config/config.ts>); [src/utils/helpers.ts](<../../../../src/utils/helpers.ts>); [src/i18n/panelI18n.tsx](<../../../../src/i18n/panelI18n.tsx>); [src/pages/restaurant/RestaurantSettings.tsx](<../../../../src/pages/restaurant/RestaurantSettings.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| restaurants | DATA-038 |
| registration_requests | DATA-035 |
| menu_items | DATA-023 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API: N/A para lógica puramente cliente; revisar operaciones compartidas por tabla. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

API: N/A o compartida; consumidores/fuentes listados en Evidence.

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Settings limita UI pero grants permiten columnas regionales; país/impuestos no son dictamen jurídico ni verificación de régimen fiscal.

Reglas de negocio relacionadas: [BR-021](../../BUSINESS_RULES.md#br-021). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Actualiza configuración de restaurante, idioma local y formato monetario; no cambia país de un proveedor externo automáticamente.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: La base rechaza por registration_requests_country_check. Fallos parciales/concurrencia: Compatibilidad CL preservada por tests regionales; number y redondeo en fronteras monetarias, sin equivalencia exacta universal entre módulos. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U22-regional-config.test.ts](<../../../../src/tests/unit/U22-regional-config.test.ts>)
- [src/tests/unit/U23-phase2-multi-country.test.ts](<../../../../src/tests/unit/U23-phase2-multi-country.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/config/regional.ts](<../../../../src/config/regional.ts>)
- [src/config/config.ts](<../../../../src/config/config.ts>)
- [src/utils/helpers.ts](<../../../../src/utils/helpers.ts>)
- [src/i18n/panelI18n.tsx](<../../../../src/i18n/panelI18n.tsx>)
- [src/pages/restaurant/RestaurantSettings.tsx](<../../../../src/pages/restaurant/RestaurantSettings.tsx>)
- [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Carta/POS/panel y SQL consumen moneda/tasa/idioma; proveedor online se deriva por país en rutas concretas.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-028](../../BUSINESS_RULES.md#br-028) → FEAT-021/FR-003.


## Cambio autorizado — 2026-10-06

- [TASK-011 — Dinero y precios](../../changes/TASK-011.md): FEAT-021/FR-290, FEAT-021/FR-291, FEAT-021/FR-292. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.

Cambio incremental: **FEAT-021/FR-293**, contrato/datos/reglas y aceptación en [TASK-011](../../changes/TASK-011.md). Estado LOCAL / REQUIRES VALIDATION SQL.


TASK-016: [configuración por cliente y pruebas de cierre](../../changes/TASK-016.md). FEAT-021/FR-344; validación del delta en curso.
