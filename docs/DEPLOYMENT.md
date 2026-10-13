# Desplegar con cuentas propias

Esta guía es para un **proyecto Supabase nuevo y vacío** y un frontend independiente. No migra datos de instalaciones privadas anteriores. La publicación del código no configura ni certifica servicios externos.

## Backend Supabase

1. Crea tu proyecto Supabase y conserva sus credenciales únicamente en tu gestor de secretos. Prepara las herramientas con `npm ci`.
2. Vincula la carpeta al proyecto nuevo y revisa el SQL antes de aplicarlo:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Comprueba en el panel que el proyecto elegido es el nuevo. No ejecutes `db reset` contra un proyecto remoto. Las versiones de migración se conservaron; se retiró una actualización de suscripciones ligada a una cuenta particular.

3. Copia `supabase/functions/.env.example` a `.env.edge.local` y completa los valores necesarios de [configuración](CONFIGURATION.md). Usa `PUBLIC_APP_URL` y `APP_URL` con tu origen HTTPS exacto, y `PUBLIC_SUPABASE_URL` con tu API. Genera secretos nuevos. No incluyas variables vacías de integraciones que todavía no usarás ni `LOCAL_TEST_ONLY`.
4. Carga los secretos y despliega las funciones:

```sh
npx supabase secrets set --env-file .env.edge.local
npx supabase functions deploy
```

El CLI utiliza las reglas `verify_jwt` declaradas en `supabase/config.toml`; las rutas públicas autorizan sus operaciones en el código. No desactives globalmente JWT ni amplíes CORS a `*`.

5. En Authentication configura Site URL con tu frontend, redirecciones a `/setup-password`, confirmación de correo, TOTP y un proveedor SMTP propio. La configuración local no reemplaza estas opciones del proyecto alojado.

## Primer administrador

Crea un usuario confirmado desde Authentication → Users en el proyecto nuevo, con una contraseña única. Copia su UUID y ejecuta, como operador de la base, esta transacción sustituyendo únicamente el UUID:

```sql
BEGIN;
INSERT INTO public.profiles (id, role, display_name)
SELECT id, 'admin', 'Administrador'
FROM auth.users
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
ON CONFLICT (id) DO UPDATE
SET role = 'admin', restaurant_id = NULL;
COMMIT;
```

Comprueba que se modificó exactamente el perfil deseado. Este privilegio se otorga desde una sesión administrativa de la base; no existe un registro público para concederse `admin`.

Entra por `/admin/login`, inscribe tu autenticador y verifica el primer TOTP. Tanto SQL como las funciones requieren AAL2 para las operaciones administrativas. No uses las fixtures ni `demo:code` en este proyecto. Conserva un procedimiento privado de recuperación del administrador.

## Frontend

En Vercel importa el repositorio y usa el preset Vite, Node 22, `npm ci`, build `npm run build` y salida `dist`. `vercel.json` ya declara la reescritura SPA y cabeceras de seguridad. Configura las variables públicas de `.env.example` con tus valores; las credenciales de proveedores pertenecen a Supabase, nunca a Vercel como variables `VITE_`.

También puedes alojar `dist` en otro servidor estático: configura fallback a `index.html`, HTTPS y cabeceras equivalentes. Adapta la CSP si usas un dominio personalizado de Supabase o telemetría propia; verifica que no habilites orígenes innecesarios.

## Servicios y comprobaciones antes de atender usuarios

- Instala el [inspector privado de imágenes](../services/image-inspector/README.md), HTTPS, control de red y renovación de firmas. Sin él no se habilitan nuevas subidas.
- Revisa las plantillas legales de `docs/legal/` y las páginas públicas: identidad del operador, contactos, país, retención, proveedores y condiciones comerciales. Los textos heredados no acreditan cumplimiento legal.
- Completa `/admin/operations` con MFA: responsables, configuración regional, retención, impresora y aprobaciones de operación. Un nombre escrito no concede permisos ni verifica un proveedor.
- Habilita pagos y DTE solo después de configurar tus cuentas, webhooks y pruebas sandbox. El motor tributario no se distribuye. Los trabajos de despacho externo deben permanecer desactivados hasta comprobar la configuración de cada instalación.
- Verifica login/MFA, recuperación por correo, aislamiento de restaurantes, carta pública, pedido/POS, subidas y respuestas de proveedores. Comprueba cabeceras HTTP, RLS y logs sin secretos. Haz un respaldo privado y un ensayo de restauración.
- Mantén cron, monitor y alertas desactivados hasta decidir sus destinos propios. No interpretes un CI local correcto como validación de producción.

Referencias: [despliegue de funciones Supabase](https://supabase.com/docs/guides/functions/deploy) y [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite).
