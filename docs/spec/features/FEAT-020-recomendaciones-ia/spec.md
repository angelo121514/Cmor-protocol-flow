> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-020 — Recomendaciones de negocio y chatbot local

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-020.
- Objetivo: Recomendaciones de negocio y chatbot local dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-020/FR-001, FEAT-020/NFR-001, FEAT-020/SEC-F001 y FEAT-020/EDGE-001.

## Actores

Owner; OpenRouter/DeepSeek como tercero; cliente del chatbot local.

## Preconditions

JWT, membresía y OPENROUTER_API_KEY; datos de restaurante disponibles.

Punto de entrada y trigger: /restaurant/ai; chatbot de carta según montaje; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | La Edge valida JWT y membresía y analiza máximo 500 pedidos completed de últimos 30 días junto con carta/inventario/propinas. | CONFIRMADO | [src/services/aiService.ts](<../../../../src/services/aiService.ts>); [src/pages/restaurant/AiRecommendations.tsx](<../../../../src/pages/restaurant/AiRecommendations.tsx>); [supabase/functions/ai-recommendations/index.ts](<../../../../supabase/functions/ai-recommendations/index.ts>); [src/components/AiChatbot.tsx](<../../../../src/components/AiChatbot.tsx>) |
| FR-002 | Limita a 10 análisis por usuario/24h; si la consulta del contador falla permite continuar y registra error. | CONFIRMADO | [src/services/aiService.ts](<../../../../src/services/aiService.ts>); [src/pages/restaurant/AiRecommendations.tsx](<../../../../src/pages/restaurant/AiRecommendations.tsx>); [supabase/functions/ai-recommendations/index.ts](<../../../../supabase/functions/ai-recommendations/index.ts>); [src/components/AiChatbot.tsx](<../../../../src/components/AiChatbot.tsx>) |
| FR-003 | Sin ventas ni carta retorna recommendations=[] sin llamar al modelo; respuestas se parsean y normalizan a tipos conocidos. | CONFIRMADO | [src/services/aiService.ts](<../../../../src/services/aiService.ts>); [src/pages/restaurant/AiRecommendations.tsx](<../../../../src/pages/restaurant/AiRecommendations.tsx>); [supabase/functions/ai-recommendations/index.ts](<../../../../supabase/functions/ai-recommendations/index.ts>); [src/components/AiChatbot.tsx](<../../../../src/components/AiChatbot.tsx>) |
| FR-004 | AiChatbot en frontend contiene respuestas locales y lógica de selección; no debe confundirse con la llamada OpenRouter del panel. | CONFIRMADO | [src/services/aiService.ts](<../../../../src/services/aiService.ts>); [src/pages/restaurant/AiRecommendations.tsx](<../../../../src/pages/restaurant/AiRecommendations.tsx>); [supabase/functions/ai-recommendations/index.ts](<../../../../supabase/functions/ai-recommendations/index.ts>); [src/components/AiChatbot.tsx](<../../../../src/components/AiChatbot.tsx>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): No hay timeout o retry explícito para OpenRouter; normalización string/enums no es validación completa del schema externo.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Credencial sólo Edge; datos agregados salen al modelo; no se observa enforcement de ai_profiling en gatherData.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Owner solicita análisis con restaurantId y JWT.
2. Handler valida membresía/cuota, recoge datos y construye prompt; sin datos retorna lista vacía.
3. OpenRouter responde JSON, se normaliza y registra uso; UI muestra sugerencias. Chatbot de carta usa lógica local separada.

## Alternative Flows

Variación específica: 11 solicitudes concurrentes antes de registrar uso. Conteo y registro son operaciones separadas; no hay reserva de cuota atómica observable.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: JWT válido sin membresía del restaurante.
- When: Se solicita análisis.
- Then: La Edge devuelve 403 forbidden.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Falla consulta ai_usage_log. When: Se comprueba cuota. Then: isWithinAiRateLimit retorna true y registra error.
- Caso 3 — CONFIRMADO. Given: OPENROUTER_API_KEY ausente. When: Se pide análisis después de auth/ownership. Then: Devuelve 500 openrouter_key_not_configured.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: 11 solicitudes concurrentes antes de registrar uso.
- Comportamiento actual: Conteo y registro son operaciones separadas; no hay reserva de cuota atómica observable.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/aiService.ts](<../../../../src/services/aiService.ts>); [src/pages/restaurant/AiRecommendations.tsx](<../../../../src/pages/restaurant/AiRecommendations.tsx>); [supabase/functions/ai-recommendations/index.ts](<../../../../supabase/functions/ai-recommendations/index.ts>); [src/components/AiChatbot.tsx](<../../../../src/components/AiChatbot.tsx>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| ai_usage_log | DATA-005 |
| orders | DATA-026 |
| menu_items | DATA-023 |
| inventory_items | DATA-019 |
| tips | DATA-040 |
| profile_restaurants | DATA-030 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-002. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-002](../../API_SPEC.md#api-002)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Credencial sólo Edge; datos agregados salen al modelo; no se observa enforcement de ai_profiling en gatherData.

Reglas de negocio relacionadas: [BR-020](../../BUSINESS_RULES.md#br-020). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Solicitud pagada a OpenRouter y fila ai_usage_log tras llamada exitosa; recomendación no muta precios automáticamente.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: La Edge devuelve 403 forbidden. Fallos parciales/concurrencia: No hay timeout o retry explícito para OpenRouter; normalización string/enums no es validación completa del schema externo. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

TEST: MISSING — no se identificó prueba dedicada de esta cadena.

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/aiService.ts](<../../../../src/services/aiService.ts>)
- [src/pages/restaurant/AiRecommendations.tsx](<../../../../src/pages/restaurant/AiRecommendations.tsx>)
- [supabase/functions/ai-recommendations/index.ts](<../../../../supabase/functions/ai-recommendations/index.ts>)
- [src/components/AiChatbot.tsx](<../../../../src/components/AiChatbot.tsx>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

OpenRouter responde JSON, se normaliza y registra uso; UI muestra sugerencias. Chatbot de carta usa lógica local separada.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-042](../../BUSINESS_RULES.md#br-042) → FEAT-020/FR-002.


## Cambio autorizado — 2026-10-06

- [TASK-012 — Límites e IA](../../changes/TASK-012.md): FEAT-020/FR-300, FEAT-020/FR-301, FEAT-020/FR-302. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
