> Referencia técnica histórica saneada. Para comenzar, usar las guías de instalación y despliegue del README. Las afirmaciones de validación histórica no certifican esta copia.

# Despliegue seguro y validación de CMOR FLOW

## 1. Aplicar base de datos

Desde una estación autenticada con el proyecto correcto de Supabase, revisar la
migración y aplicar solamente las pendientes:

```bash
supabase db push
supabase db lint
```

Las migraciones de esta entrega son `20260806000001` a `20260806000004`,
`20260807004547`, `20260807005314`, `20260807005535`, `20260807005738`,
`20260807010049`, `20260807010340`, `20260807010507`, `20260807010636` y
`20260807010730`. Incluyen el cierre de RPC heredadas, validación y límite de
pedidos públicos, endurecimiento del `search_path`, el cierre de funciones de
disparo, índices de claves foráneas activas y optimización de políticas RLS.
No se debe ejecutar manualmente SQL de prueba contra producción.

## 2. Configurar secretos de Edge Functions

Configurar en Supabase, sin guardarlos en el repositorio:

- `FLOW_API_KEY`, `FLOW_SECRET_KEY` y `FLOW_API_URL`. Para sandbox debe ser
  `https://sandbox.flow.cl/api`; producción usa la URL entregada por Flow.
- `PUBLIC_APP_URL` y `ALLOWED_ORIGINS` con el dominio HTTPS final de la app.
- `INTERNAL_FUNCTION_SECRET` sólo si se utiliza el proceso interno
  `invite-owner`; debe ser aleatorio y diferente de las claves de Flow.

Desplegar las funciones modificadas y confirmar que las funciones de pago y
gestión de clientes conservan `verify_jwt = true`. La única excepción es
`flow-checkout`: atiende el registro público sin JWT, valida una solicitud de
registro pendiente y evita intentos duplicados antes de contactar a Flow.

## 3. Configurar Flow

En Flow, registrar la URL HTTPS del webhook `webhooks/flow` y la URL de retorno
del sitio. El webhook es la única vía que activa una compra: una redirección del
navegador sólo muestra el estado pendiente. Probar primero con credenciales de
sandbox.

## 4. Pruebas de aceptación de pago

En staging, para cada plan:

1. Prueba gratuita: crear solicitud, recibir invitación por correo, crear
   contraseña y confirmar acceso con fecha de expiración.
2. Básico y Pro: iniciar checkout, simular pago aprobado y confirmar que el
   webhook crea la invitación y la suscripción correspondiente.
3. De por vida: confirmar precio de $500.000 CLP, valor referencial de
   $1.900.000, texto "Oferta por tiempo limitado", pago único y ausencia de
   renovación periódica.
4. Reenviar el mismo webhook y confirmar que no duplica restaurantes,
   invitaciones ni cobros registrados.

## 5. Controles continuos

Antes de fusionar, ejecutar `npm run type-check`, `npm run build`,
`npm run test:coverage` y `npm audit --omit=dev`. Para validar un entorno real:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run security-check
```

En GitHub Actions, añadir secretos aislados de staging para habilitar los jobs
`Security check (Supabase staging)` y `Tests E2E`. Hasta que existan, CI deja
constancia explícita de que esos dos controles fueron omitidos; no son una
validación de producción.

## 6. Ejecución aislada de E2E

Los E2E que crean restaurantes, pedidos, mesas, solicitudes DSAR, cambios de
administración o transacciones de pago están protegidos por defecto. Nunca se
deben ejecutar usando `.env` de desarrollo si éste apunta al proyecto
publicado.

Preparar un proyecto Supabase de staging desechable y definir, fuera del
repositorio:

```bash
E2E_BASE_URL=https://staging.example.com
E2E_OWNER_EMAIL=owner-e2e@example.test
E2E_OWNER_PASSWORD=una-clave-exclusiva-de-staging
E2E_RESTAURANT_SLUG=restaurante-e2e
E2E_ADMIN_EMAIL=admin-e2e@example.test
E2E_ADMIN_PASSWORD=otra-clave-exclusiva-de-staging
E2E_REGISTRATION_ENABLED=true
E2E_DSAR_ENABLED=true
E2E_ADMIN_MUTATIONS_ENABLED=true
E2E_FLOW_SANDBOX_ENABLED=true
E2E_PAYMENT_TEST_EMAIL=pagos-e2e@example.test
```

`E2E_WEBPAY_ENABLED` permanece en `false`: Webpay directo no es una pasarela
activa del producto; los pagos se prueban mediante Flow Sandbox. Los casos
E02, E03, E08, E09 y E10 reutilizan el owner preaprovisionado y eliminan los
datos temporales que crean cuando el flujo lo permite.

### Base reproducible

Las migraciones `20260101000000` a `20260101000011` versionan la secuencia
histórica que antes sólo vivía en `database/`: esquema inicial, perfiles Auth,
privacidad, registro, límites de prueba, multi-sucursal y clientes. Fueron
marcadas como ya aplicadas en el historial del proyecto remoto, por lo que no
se ejecutan de nuevo sobre producción.

La secuencia completa fue validada desde un PostgreSQL de Supabase limpio. Al
probar `supabase db reset` localmente, usa un stack completo de Supabase (no un
contenedor PostgreSQL aislado), porque las migraciones también dependen de los
esquemas internos `auth` y `storage`.

## 7. Pendiente de fase 6: protección de contraseñas filtradas (HIBP)

**Estado:** pendiente por capacidad del plan, sin cambios aplicados.

El 7 de agosto de 2026 se confirmó que el proyecto de producción **SaaS
Restaurante** (`YOUR_PROJECT_REF`) es el correcto, pero su organización
está en el plan Free. Supabase ofrece la protección contra contraseñas filtradas
mediante Have I Been Pwned (HIBP) sólo en Pro o superior; por tanto no es
posible habilitarla todavía.

Cuando la organización esté en Pro o superior:

1. Abrir `Authentication -> Attack Protection` del proyecto de producción.
2. Activar **Prevent use of leaked passwords** y guardar.
3. Confirmar que las reglas de contraseña de Auth siguen siendo compatibles
   con el flujo `setup-password`.
4. Ejecutar manualmente, sin usar cuentas reales de clientes:
   - Crear o actualizar una contraseña de prueba robusta y confirmar éxito.
   - Intentar establecer una contraseña conocida y filtrada; Auth debe
     rechazarla.
   - Iniciar sesión con una cuenta existente para confirmar que no se bloquea
     por una contraseña anterior.
   - Probar recuperación/restablecimiento de contraseña y el enlace de
     invitación del propietario.

La revisión de asesores de Supabase conserva avisos históricos de tablas de
archivo/particiones con RLS sin políticas y de RPC públicas necesarias para los
pedidos y QR. No se deben eliminar ni restringir esas RPC sin una revisión de
su contrato público y de los flujos de cocina/POS. Los intentos fallidos de
inicio de sesión observados en los registros de Auth deben seguirse revisando
en caso de aumento inusual.
