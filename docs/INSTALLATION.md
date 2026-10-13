# Partir desde cero

## Requisitos

- Node.js 22.12 o posterior; se recomienda la rama 22. npm y Git.
- Docker Desktop con motor Linux activo. La pila Supabase usa varios contenedores; la primera descarga puede tardar.
- Puertos libres: frontend 5173, API 55421, PostgreSQL 55422, Studio 55423, correo 55424. Otras utilidades de Supabase usan puertos 55420 y 55425–55429 según configuración.
- Para la validación completa: Python 3.12, Chromium de Playwright y ClamAV. El antivirus requiere al menos 3 GiB adicionales y su puerto de validación es 56310.

Los comandos siguientes se ejecutan en la raíz de una copia nueva. Funcionan en PowerShell y shells POSIX salvo cuando se indica lo contrario. No copies el `.env` de otra instalación.

## Instalar y configurar

Después de clonar el repositorio público:

```sh
npm ci
docker version
npx supabase start
node scripts/reset-local-validation.mjs
npm run setup:local
npm run seed:local
```

`reset-local-validation.mjs` **borra la base local desechable** `cmor-flow-open-source-validation`, aplica las migraciones y desactiva los cron externos. Úsalo únicamente en una instalación local nueva o cuyos datos puedas perder. Rechaza otros identificadores y evita competir con una validación activa. No ejecutes dos copias de esta pila simultáneamente: comparten identificador y puertos. El identificador de esta distribución es distinto del repositorio privado de origen.

`setup:local` obtiene las claves del Supabase local y crea `.env` y `.local-test/development-edge.env` sin imprimirlas. Rechaza un destino inesperado y no sobrescribe archivos existentes. Para repetirlo, conserva o mueve primero tu configuración local. Las claves de servidor no se escriben en el `.env` del navegador.

`seed:local` crea restaurantes Fixture A/B, platos ficticios y actores de prueba mediante la base local. Guarda las credenciales sintéticas en `.local-test/fixtures.json`, ignorado por Git. No lo ejecutes contra una base con información que debas conservar.

En otra terminal, sirve las funciones:

```sh
npx supabase functions serve --env-file .local-test/development-edge.env
```

En una tercera terminal, inicia el frontend:

```sh
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). La inspección de imágenes, el correo DSAR y los pagos externos no están configurados en esta demostración básica. Las invitaciones de Supabase Auth llegan al buzón local, accesible desde la URL de correo mostrada por `npx supabase status`. El asistente de carta funciona localmente; la IA externa permanece desactivada.

## Primer recorrido

Las siguientes credenciales son públicas, sintéticas y exclusivas de la pila desechable:

| Actor | Correo | Contraseña |
|---|---|---|
| Dueño Fixture A | `ownera@fixture.example.test` | `LocalFixture-Only-2026!` |
| Dueño Fixture B | `ownerb@fixture.example.test` | `LocalFixture-Only-2026!` |
| Administrador | `admin@fixture.example.test` | `LocalFixture-Only-2026!` |

1. Entra en `/login` con el dueño A y abre `/restaurant/pos`. Agrega Fixture dish A, envíalo a cocina y cobra en efectivo. Comprueba el pedido en el panel y que no aparezca el plato del restaurante B.
2. Abre `/menu/fixture-a` en una ventana privada para consultar la carta pública y probar el flujo de pedido disponible.
3. Entra por `/admin/login` con el administrador. El seed ya inscribió un factor TOTP sintético. Ejecuta `npm run demo:code` y usa el código vigente en la pantalla MFA. Nunca se elimina ese control para facilitar la demo.
4. Las subidas de imágenes fallarán de forma controlada hasta configurar el [inspector](../services/image-inspector/README.md). No requieren un bypass para recorrer POS con los platos precargados.

## Validación completa

```sh
python -m pip install --require-hashes -r services/image-inspector/requirements.txt
node scripts/prepare-image-inspection.mjs --update
python -m unittest discover -s services/image-inspector -p test_scanner.py
npx playwright install chromium
npm run test:database
```

Espera a que el antivirus tenga firmas vigentes antes de la prueba Python. `test:database` obtiene sus propias claves locales, genera fixtures, inicia proveedores simulados e inspector temporal, ejecuta SQL/PostgREST/Edge y los recorridos de navegador autenticados. No necesita secretos de producción ni sustituye una base remota si falta Docker.

Para verificaciones de frontend sin Docker:

```sh
npm run lint
npm run type-check
npm run type-check:edge
npx tsc -p tsconfig.tests.json --pretty false
npm run test:coverage
npm run test:e2e
npm run test:docs
npm run check:public
```

`test:e2e` usa proveedores simulados y no acredita RLS real. Para `build` debe existir `.env` con las claves públicas locales creadas antes; los tests fijan su propia configuración sintética. Si ya tienes Chrome, puedes establecer `LOCAL_BROWSER_CHANNEL=chrome` en el entorno del proceso en lugar de descargar Chromium.

## Detener y resolver errores

- Detén frontend y funciones con Ctrl+C; ejecuta `npx supabase stop`. Si preparaste ClamAV, detén solo su contenedor con `docker stop cmor-flow-open-source-image-validation-clamav`.
- Si Docker no responde, inicia su motor Linux y vuelve a comprobar `docker version`. No cambies la URL a producción para sortear el error.
- Si no carga la app, comprueba `.env`, la API local y reinicia Vite después de cambiar variables.
- Si MFA rechaza un código, genera otro y comprueba la hora del sistema. Repetir el seed reemplaza únicamente los factores de ese administrador sintético.
- No apliques scripts SQL históricos: `supabase/migrations/` es la fuente del esquema.

Referencia primaria: [Supabase CLI y entorno local](https://supabase.com/docs/guides/local-development/cli/getting-started).
