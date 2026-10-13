# Configuración de una instalación

## Navegador

Copia `.env.example` a `.env` para una configuración manual. Las variables `VITE_` se incluyen en el JavaScript público durante el build; nunca contienen secretos de proveedores ni service role.

| Variable | Uso |
|---|---|
| `VITE_SUPABASE_URL` | API de tu proyecto Supabase; local: `http://127.0.0.1:55421`. |
| `VITE_SUPABASE_ANON_KEY` | Clave pública **anon** de tu proyecto. Los controles reales son Auth y RLS. |
| `VITE_SUPPORT_EMAIL`, `VITE_SALES_EMAIL`, `VITE_PRIVACY_EMAIL` | Contactos públicos del operador. Los valores `example.test` son ejemplos que no reciben correo. |
| `VITE_SUPPORT_WHATSAPP` | Número internacional del soporte, solo dígitos. Vacío desactiva el botón. |
| `VITE_OPERATOR_NAME` | Nombre del operador mostrado en los resúmenes de privacidad. |
| `VITE_SENTRY_DSN` | Telemetría opcional, vacía por defecto. Revisar tratamiento de datos antes de habilitarla. |
| `VITE_APP_VERSION` | Versión informativa del frontend. |

Después de cambiar estas variables, reinicia Vite o genera y despliega un build nuevo. Los documentos legales y el texto de las páginas siguen siendo plantillas: actualizar el contacto no adapta automáticamente todas las condiciones del servicio.

## Funciones de servidor

La plantilla está en `supabase/functions/.env.example`. Cópiala a `.env.edge.local`, ignorado por Git. Supabase administra e inyecta `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; no publiques ni copies sus valores al frontend.

| Grupo | Variables y comportamiento |
|---|---|
| Orígenes y enlaces | `PUBLIC_APP_URL`: origen exacto del frontend; `APP_URL`: mismo origen para invitaciones; `PUBLIC_SUPABASE_URL`: API pública. `ALLOWED_ORIGINS`: orígenes adicionales separados por comas. HTTPS, sin rutas ni comodines. Sin origen configurado, CORS permite solo los orígenes locales. Cuando el origen principal es local, permite localhost y 127.0.0.1 en ese mismo puerto; producción no hereda esos alias. |
| Privacidad por correo | `RESEND_API_KEY`, `DSAR_FROM_EMAIL`: remitente de tu dominio verificado. Sin ambos, el envío falla con `mail_not_configured`. Auth usa su propia configuración SMTP en Supabase. |
| Acciones internas | `INTERNAL_FUNCTION_SECRET`: secreto aleatorio propio para operaciones internas. No usar la credencial sintética de pruebas. |
| Imágenes | `IMAGE_INSPECTION_URL`, `IMAGE_INSPECTION_SECRET`: inspector privado HTTPS. Secreto aleatorio de al menos 32 caracteres. Sin servicio válido se rechazan nuevas subidas. |
| Flow | `FLOW_API_KEY`, `FLOW_SECRET_KEY`; configurar entorno y webhooks propios antes de activar cobros. |
| Mercado Pago | `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`. |
| Webpay | `WEBPAY_COMMERCE_CODE`, `WEBPAY_API_KEY`, `WEBPAY_ENVIRONMENT` (`integration` o `production`). |
| Contabilidad/DTE | `TAX_API_BASE_URL`, `ACCOUNTING_MASTER_KEY` y credenciales por restaurante mediante el flujo administrativo. El motor tributario es un servicio externo y **no se incluye** en este repositorio. Sin endpoint explícito no se construye el cliente. |

Los overrides `RESEND_API_URL`, `FLOW_API_URL`, `MERCADO_PAGO_API_URL` y `WEBPAY_API_URL` sirven a los proveedores simulados de pruebas; no copiarlos sin revisión a producción. `LOCAL_TEST_ONLY=true` bloquea destinos externos en las funciones que cargan el guard local y pertenece únicamente a la pila desechable. La IA externa está deshabilitada aunque se configure una clave.

## Automatizaciones y respaldos

CI realiza verificaciones locales y no despliega. El monitor está desactivado hasta configurar `PRODUCTION_MONITOR_ENABLED=true` en las variables de Actions y `HEALTHCHECK_URL` HTTPS en sus secretos. `ALERT_WEBHOOK_URL` es opcional; configurarlo autoriza las notificaciones del monitor. Los issues del monitor no incluyen la respuesta cruda ni la URL secreta.

Los scripts Bash `backup-db.sh` y `restore-db.sh` requieren `SUPABASE_DB_URL` o `SUPABASE_PROJECT_REF` y `SUPABASE_DB_PASSWORD`, además de clientes PostgreSQL compatibles. No tienen un proyecto predeterminado. En Windows requieren Git Bash o WSL. Guarda los respaldos en almacenamiento privado cifrado: incluyen datos personales y registros de autenticación. No se distribuye un workflow que suba respaldos a artefactos de un repositorio público. La restauración exige confirmación y debe probarse primero en una base desechable.

## Recursos externos de la interfaz

La fuente Inter se solicita a Google Fonts. El generador externo de QR, donde se utilice, recibe la URL pública de la carta. Revisar estos proveedores al definir la política de cada instalación; los datos de clientes no deben incorporarse a URLs públicas ni a un QR de carta.
