> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Visión general del sistema

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

AS-IS — análisis local del 2026-10-05, commit `319a4d2a9bd88d2b1b16b3d61ef8ae7094a8948d`.

## Propósito, usuarios y límites

**CONFIRMADO:** CMOR FLOW es una plataforma de operación de restaurantes: carta pública y pedidos QR, panel de restaurante, POS, gestión de cocina, clientes, inventario, mesas, meseros, caja, reportes, planes y panel de administración. Integra privacidad/DSAR, recomendaciones IA y contabilidad DTE chilena. Evidencia: [App](../../src/App.tsx), [dashboard restaurante](../../src/pages/restaurant/Dashboard.tsx), [dashboard admin](../../src/pages/admin/Dashboard.tsx), [catálogo](FEATURES.md).

Actores: cliente/prospecto anónimo; owner; perfil staff; administrador; mesero atribuido mediante PIN; cocina mediante token; DPO representado por funciones/pantallas de privacidad; cron contable y proveedores. **INFERIDO:** estos grupos forman contextos funcionales; no existen bounded contexts DDD explícitamente declarados en código. `staff` en perfiles y roles de `waiters` son conceptos diferentes.

Unidad de ownership: restaurante (`restaurant_id`). Un perfil puede pertenecer a varios restaurantes por `profile_restaurants`; la sucursal es otra fila restaurants, no una partición física ni una base por tenant. [Dominio](DOMAIN_MODEL.md), [datos](DATA_MODEL.md).

## Tecnología y componentes

| Capa | Evidencia confirmada |
|---|---|
| UI | React 19, React Router, TypeScript, Vite, Tailwind, Lucide, Recharts, qrcode.react; dependencias declaradas en [manifest](../../package.json), versiones resueltas en package-lock |
| Identidad y datos | Supabase JS; Auth, PostgREST, PostgreSQL, RLS, RPC, Storage y Realtime; [config local](../../supabase/config.toml) declara PostgreSQL 15 |
| Servidor de funciones | Edge Functions Deno con SDK Supabase importado por URL y service role; `_shared` centraliza ciertos clientes y autorización |
| Despliegue | Frontend Vercel declarado en [vercel.json](../../vercel.json); backend Supabase; motor tributario externo con URL por defecto en Render |
| Pruebas | Vitest/jsdom/Testing Library, Playwright, fixtures/Faker; no se acredita cobertura integral de endpoints/RLS por nombres de suites |
| Operación | Sentry condicional a DSN, GitHub Actions para CI/monitoreo/backup; pg_cron/pg_net para contabilidad |

**DESCONOCIDO:** configuración y versiones efectivas de producción, propietarios de funciones, grants heredados, cron realmente habilitado, credenciales y sus proveedores/regiones, tráfico y SLA. URLs/comentarios de producción son evidencia de intención local, no constatación del despliegue.

## Información y confianza

El navegador contiene rutas, estado React y contexto de sesión; llama directamente a Supabase para tablas/RPC y a Edge para integraciones. SQL conserva reglas y efectos importantes; Edge con service role puede omitir RLS y necesita autorización explícita. No se encontró un servidor Node de negocio independiente ni capas universales controller/repository.

Las fronteras son navegador no confiable → Auth/PostgREST/Edge → PostgreSQL/service role → proveedores externos. La separación visual y filtros enviados por el cliente no autorizan recursos. [Arquitectura](ARCHITECTURE.md), [seguridad](SECURITY.md), [amenazas](THREAT_MODEL.md).

Modo mock: implementación conservada para tests/ramas legacy, no fallback activo en el cliente vigente; [config/supabase](../../src/config/supabase.ts), [MockSupabaseClient](../../src/config/mockSupabase.ts). Sus permisos y respuestas de prueba no demuestran seguridad/semántica de Supabase real.

## Entrada recomendada a las specs

[FEATURES](FEATURES.md) → spec individual → [BUSINESS_RULES](BUSINESS_RULES.md) → [API_SPEC](API_SPEC.md) / [DATA_MODEL](DATA_MODEL.md) → [TRACEABILITY](TRACEABILITY.md). Las diferencias y prioridades están en [AUDIT_REPORT](AUDIT_REPORT.md); el flujo futuro en [PLAN](PLAN.md) y [TASKS](TASKS.md).


## Cambio autorizado — alcance

React/Vite/Supabase conservados. Checkout añade tareas002–015 y22 migraciones nuevas; sin despliegue. IA externa desactivada, asistente local conservado. [Estado actual](IMPLEMENTATION_STATUS.md) distingue documentación preparada,código local,prueba confiable y operación desplegada.
