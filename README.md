# CMOR FLOW

Plataforma de código abierto para restaurantes: carta digital, pedidos, POS, cocina, clientes, inventario y administración. Construida con React 19, TypeScript, Vite y Supabase. Licencia [MIT](LICENSE).

## Comenzar

Necesitas Node.js 22.12 o posterior y Docker con motor Linux activo. En una copia nueva:

```sh
npm ci
npx supabase start
node scripts/reset-local-validation.mjs
npm run setup:local
npm run seed:local
```

El reset **borra la pila local desechable de este proyecto**. No lo uses sobre datos locales que debas conservar. La [guía completa desde cero](docs/INSTALLATION.md) explica requisitos, puertos, cuentas ficticias y MFA.

Sirve las funciones en otra terminal:

```sh
npx supabase functions serve --env-file .local-test/development-edge.env
```

Inicia el frontend en una tercera terminal:

```sh
npm run dev
```

Abre [localhost:5173](http://localhost:5173). Para probar POS entra por `/login` con `ownera@fixture.example.test` y la contraseña sintética `LocalFixture-Only-2026!`. El administrador de la demo usa MFA: consulta la guía antes de entrar por `/admin/login`.

## Documentación

- [Instalación local y primer recorrido](docs/INSTALLATION.md).
- [Variables públicas, secretos e integraciones](docs/CONFIGURATION.md).
- [Despliegue con cuentas propias y primer administrador](docs/DEPLOYMENT.md).
- [Arquitectura y especificación heredada](docs/spec/SPEC_INDEX.md).
- [Auditoría y validación de esta distribución](docs/OPEN_SOURCE_AUDIT.md).
- [Publicar esta copia en GitHub](docs/PUBLISHING.md).
- [Contribuir](CONTRIBUTING.md), [reportar vulnerabilidades](SECURITY.md) y [avisos de terceros](THIRD_PARTY_NOTICES.md).

## Servicios adicionales

Supabase es el backend real; no se activa un mock cuando faltan variables. Pagos, correo, inspector antivirus y contabilidad requieren cuentas o servicios propios. El motor tributario no está incluido. Sin inspector se rechazan nuevas subidas de imágenes. La IA externa permanece desactivada; el asistente de carta funciona localmente.

Los contactos `example.test`, precios, textos comerciales y documentos legales son ejemplos o plantillas. Cada operador debe adaptarlos antes de atender usuarios reales. Ninguna clave de servidor debe llevar prefijo `VITE_`.

CI valida código, pruebas locales y una base desechable; no despliega. Los monitores están desactivados por defecto y los respaldos deben guardarse fuera de GitHub público.

## Comprobar cambios

```sh
npm run lint
npm run type-check
npm run type-check:edge
npx tsc -p tsconfig.tests.json --pretty false
npm run test:coverage
npm run test:e2e
npm run test:docs
npm run check:public
npm run build
```

Para SQL, RLS y funciones reales ejecuta también `npm run test:database` después de preparar Supabase, Python, antivirus y Chromium según la guía. Consulta el informe de auditoría para saber qué verificaciones se ejecutaron realmente y cuáles requieren otro entorno.

## Estructura

| Directorio | Contenido |
|---|---|
| `src/` | Frontend, servicios y pruebas. |
| `shared/` | Contratos y utilidades compartidas. |
| `supabase/migrations/` | Fuente canónica del esquema. |
| `supabase/functions/` | Funciones de servidor. |
| `services/image-inspector/` | Inspector privado de imágenes. |
| `scripts/` | Preparación, validación y operación. |
| `docs/` | Guías públicas y referencia técnica. |

Esta distribución inicia un historial Git independiente. No incluye configuración local, datos de clientes, respaldos ni evidencia de despliegues privados. El resumen público de saneamiento no sustituye la gestión privada de credenciales expuestas.
