> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-005 — Carta, variantes, disponibilidad e imágenes

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-005.
- Objetivo: Carta, variantes, disponibilidad e imágenes dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-005/FR-001, FEAT-005/NFR-001, FEAT-005/SEC-F001 y FEAT-005/EDGE-001.

## Actores

Owner/staff en panel; cliente como lector.

## Preconditions

Restaurante accesible para edición; público según policies de menú.

Punto de entrada y trigger: /restaurant/menu, /menu/:slug; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | El servicio crea, edita, elimina platos y alterna is_available; CustomerMenu recibe cambios de menu_items por Realtime. | CONFIRMADO | [src/pages/restaurant/Menu.tsx](<../../../../src/pages/restaurant/Menu.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [src/components/ImageDropZone.tsx](<../../../../src/components/ImageDropZone.tsx>); [supabase/migrations/20260101000004_trial_limits.sql](<../../../../supabase/migrations/20260101000004_trial_limits.sql>) |
| FR-002 | La inserción de un plato en free_trial se rechaza si ya existen 30; la UI también aplica ese límite. | CONFIRMADO | [src/pages/restaurant/Menu.tsx](<../../../../src/pages/restaurant/Menu.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [src/components/ImageDropZone.tsx](<../../../../src/components/ImageDropZone.tsx>); [supabase/migrations/20260101000004_trial_limits.sql](<../../../../supabase/migrations/20260101000004_trial_limits.sql>) |
| FR-003 | ImageDropZone valida imagen y tamaño por defecto 2 MB, comprime hasta 800x800 JPEG y sube a menu-images o usa base64 legacy. | CONFIRMADO | [src/pages/restaurant/Menu.tsx](<../../../../src/pages/restaurant/Menu.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [src/components/ImageDropZone.tsx](<../../../../src/components/ImageDropZone.tsx>); [supabase/migrations/20260101000004_trial_limits.sql](<../../../../supabase/migrations/20260101000004_trial_limits.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Bucket local declara máximo 5 MB; límite UI por defecto 2 MB y signed URL de 100 años. No equivale a expiración corta.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: RLS controla escritura; rutas Storage usan carpeta restaurante. MIME cliente y compresión no demuestran validación server-side de contenido.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. El operador carga carta del restaurante y edita nombre/precio/opciones/disponibilidad.
2. Imagen opcional se valida y comprime, luego se sube o se procesa por rama legacy de componente.
3. Servicio persiste plato; SQL aplica límite trial/URL y Realtime actualiza consumidores.

## Alternative Flows

Variación específica: Precio cero en formulario. Menu exige formData.base_price truthy y no acepta cero mediante ese formulario.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Archivo no image/* o mayor que 2 MB.
- When: Se carga con configuración por defecto.
- Then: Se muestra error antes de la compresión/subida.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Trial con 30 platos. When: Se inserta otro plato. Then: Trigger rechaza antes de INSERT.
- Caso 3 — DESCONOCIDO. Given: Upload exitoso pero plato no guardado. When: Falla persistencia posterior. Then: No se acredita rollback/limpieza automática del archivo.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Precio cero en formulario.
- Comportamiento actual: Menu exige formData.base_price truthy y no acepta cero mediante ese formulario.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/pages/restaurant/Menu.tsx](<../../../../src/pages/restaurant/Menu.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [src/components/ImageDropZone.tsx](<../../../../src/components/ImageDropZone.tsx>); [supabase/migrations/20260101000004_trial_limits.sql](<../../../../supabase/migrations/20260101000004_trial_limits.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| menu_items | DATA-023 |
| menu_categories | DATA-022 |
| recipes | DATA-034 |
| recipe_ingredients | DATA-033 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-174, API-175, API-176, API-177, API-178. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-174](../../API_SPEC.md#api-174), [API-175](../../API_SPEC.md#api-175), [API-176](../../API_SPEC.md#api-176), [API-177](../../API_SPEC.md#api-177), [API-178](../../API_SPEC.md#api-178)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

RLS controla escritura; rutas Storage usan carpeta restaurante. MIME cliente y compresión no demuestran validación server-side de contenido.

Reglas de negocio relacionadas: [BR-005](../../BUSINESS_RULES.md#br-005). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Escritura/borrado de platos y archivos; receta se guarda en llamadas separadas.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: Se muestra error antes de la compresión/subida. Fallos parciales/concurrencia: Bucket local declara máximo 5 MB; límite UI por defecto 2 MB y signed URL de 100 años. No equivale a expiración corta. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/e2e/E02-create-menu.spec.ts](<../../../../src/tests/e2e/E02-create-menu.spec.ts>)
- [src/tests/e2e/E10-menu-validation.spec.ts](<../../../../src/tests/e2e/E10-menu-validation.spec.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/pages/restaurant/Menu.tsx](<../../../../src/pages/restaurant/Menu.tsx>)
- [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>)
- [src/components/ImageDropZone.tsx](<../../../../src/components/ImageDropZone.tsx>)
- [supabase/migrations/20260101000004_trial_limits.sql](<../../../../supabase/migrations/20260101000004_trial_limits.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Servicio persiste plato; SQL aplica límite trial/URL y Realtime actualiza consumidores.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-012 — Límites e IA](../../changes/TASK-012.md): FEAT-020/FR-300, FEAT-020/FR-301, FEAT-020/FR-302. Validación local PASS; despliegue UNKNOWN.
- [TASK-014 — Operación, archivos y configuración](../../changes/TASK-014.md): FEAT-022/FR-320, FEAT-022/FR-321, FEAT-022/FR-322. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
