> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-016 — Cierre de pendientes y configuración por cliente

Autorizado 2026-10-07. El usuario indica que el producto se venderá y que el administrador configurará responsables, impresora, catálogo y zonas. No exige inventar responsables ni validar hardware no conectado. Estado: LOCAL_AND_CI_VALIDATED; evidencia final enlazada al cierre.

## Requisitos

- **FEAT-024/FR-340** — Configurar responsables, aprobación comercial, impresión manual y zonas desde admin AAL2 con revisión concurrente.
- **FEAT-019/FR-341** — Purgar snapshots vencidos y solicitudes terminales sólo bajo política opt-in; respetar conservación legal.
- **FEAT-009/FR-342** — Descargar CSV en navegador autenticado con 1251 pedidos pagados y proteger fórmulas.
- **FEAT-018/FR-343** — Verificar facturación autenticada con 1251 pagos/facturas, aislamiento, errores visibles y limpieza de resultados obsoletos.
- **FEAT-021/FR-344** — Probar contención real de moneda y creación de pedido en ambos órdenes de bloqueo.
- **FEAT-024/FR-345** — Entregar commit y CI remoto verificables; configuración real del cliente queda a su administrador por instrucción expresa.

- **FEAT-024/FR-346** — Inspección completa y antivirus real obligatorio; canonizar PNG y rechazar fallo de servicio o firmas vencidas.

- **FEAT-024/FR-347** — Auditoría de dependencias sin vulnerabilidades conocidas; preservar estilos, compilación y suites.

- **FEAT-024/FR-348** — GET sólo firma imágenes publicadas por el restaurante dueño de la carpeta; otro tenant no puede otorgar esa publicación ni escribir bytes directamente en Storage.

## Implementación y aceptación

Admin /admin/operations protegido por MFA. Configuración versionada; dos ediciones con la misma revisión sólo permiten una. Contactos no conceden autoridad. Confirmación de impresión es declaración manual auditada, nunca detección física. Secretos se configuran en servidor; readiness devuelve presencia, no valores ni acreditación de proveedor. Zona IANA validada en PostgreSQL y aplicada a reportes; fallback histórico preservado.

Snapshots se purgan por expiración 24h, en lotes 500 máximo1000, SKIP LOCKED y cascada. Solicitudes se conservan por defecto; activar borrado exige responsable de privacidad, referencia de política y días1–3650. Se conservan solicitudes activas, fallidas recuperables, snapshots aún vigentes y conservación legal. Procedimientos contractuales owner/staff permanecen separados.

## Evidencia y pruebas

I18 prueba bloqueos reales y RPC autenticada en ambos órdenes. I19 prueba AAL1/AAL2, grants, revisión, zona, expiración, retención opt-in y hold. trusted-local-flows añade reportes y facturación reales con1251 registros. Fallo de historial limpia filas y se muestra como error. SQL31 es migración nueva; las89 históricas no cambian. SEC-001/004/007/008/014/015; API-246–251, DATA-060–062, BR-061–063.

## Pendientes de instalación

El administrador completa la configuración y pruebas físicas/reales de cada cliente. Los resultados locales usan proveedores simulados. Commit/CI y escaneo completo aprobados; evidencia final enlazada al cierre.

## Archivos

POST menu-image exige inspección privada con bearer exclusivo de servidor, TLS fuera de pruebas y vinculación SHA-256 de entrada. Python verifica todos los píxeles, límites y CRC; genera un PNG sin metadatos, con antivirus original y final. ClamAV debe tener firmas de siete días o menos. Errores400/503 no escriben Storage. Las imágenes previas se conservan. [Instalación y límites](../../../services/image-inspector/README.md). Prueba real EICAR en memoria, corrupción PNG y aislamiento Storage en I13; fallos de transporte/configuración en prueba del adaptador. No constituye garantía frente a malware desconocido.

## Dependencias y compatibilidad

La auditoría inicial registró19 avisos (11 altos/8 moderados), todos ligados a herramientas de desarrollo. Faker10.6 y Tailwind4.3.3 eliminan cadenas sin parche compatible; se conserva el tema mediante @config y las reglas de componentes se expanden sin @apply de clases personalizadas. Vitest/coverage/UI4.1.11 y actualizaciones transitivas corrigen los restantes. Lockfile actualizado; React/Vite/Supabase conservan sus versiones instaladas. Auditoría al instalar:0 vulnerabilidades conocidas. Verificación final de suites aprobada. El navegador debe soportar CSS moderno requerido por Tailwind4 (validación local Chrome instalado y CI Chromium). El hook de suscripción descarta respuestas de otra sucursal y limpia datos ante errores; pruebas subscription-isolation.

## Aislamiento y transporte de imágenes

API-234 filtra simultáneamente restaurant_id de la carpeta, URL canónica y publicación. I13 intenta publicar desde B una imagen A no publicada:404; publicación válida desde A:302. INSERT/UPDATE directo en Storage se deniega incluso al owner, preservando SELECT/DELETE propios. RISK-014; BR-064; SEC-004/008.

El lector exige Content-Length, retiene como máximo2200000 bytes multipart y limita lectura a10s. Los cuerpos rechazados se drenan descartando contenido, sin esperar el reconocimiento de cancelación: responder antes de consumirlos bloqueaba el forwarding del runtime local. HTTP real comprueba413 por tamaño; el lector real se prueba con longitud ausente/subdeclarada y stream detenido. Los diagnósticos con chunked grande se registran como intentos fallidos, no resultados aprobados. El cliente normal envía FormData con tamaño conocido. El proxy de cada instalación debe imponer límites y tiempos propios; no se certifica el manejo de conexiones lentas del proveedor. JPEG conserva orientación visual al retirar EXIF.

Las URL Storage históricas firmadas durante100 años se conservan (baseline ImageDropZone); la app no puede revocarlas retroactivamente sin reconciliar objetos/URLs o claves del proveedor. El administrador debe revisar ese inventario desplegado antes de declarar revocación de medios heredados. No se movieron ni borraron imágenes históricas.

## Reserva tardía de facturación

**FEAT-018/FR-349** — I17 de instalación limpia detectó503 al consultar un cliente tras dos solicitudes concurrentes. Prueba determinista de la RPC confirmó que reservar después de confirmar la primera operación devolvía new=true: el caller había leído ausencia antes del commit. SQL34 revalida el efecto confirmado bajo el bloqueo de restaurante, tanto para cliente como para suscripción activa del mismo plan. Conserva la barrera creating/reconcile y permite crear una suscripción después de cancelarla. Índices únicos impiden duplicados; preflight bloquea duplicados históricos, sin eliminarlos. I17 verifica reserva tardía new=false, una única llamada al simulador por efecto y rechazo23505 del segundo cliente. RISK-006; SEC-003/004/007. Validación final en curso.

## Seguimiento 2026-10-08

I17/RPC tardía y proveedor único aprobados en integración actual.320 unitarias PASS. Certificación final clean123/baseline89→123 pendiente por arranque Docker; no declarar nivel4 del delta final hasta comprobarlo. Configuración humana/comercial por administrador aceptada por el usuario. [Evidencia](../FOLLOWUP_VALIDATION.json).

## Compatibilidad CI y monitor

FR-345: el primer CI falló por permiso PR de Gitleaks (403) y por configuración privada ausente en unitarias; no se registra como aprobación. Se concede sólo contents/read y pull-requests/read, comentarios automáticos desactivados. Vitest declara origen sintético local; el guard sigue rechazando llamadas sin mock. El monitor legado contenía secrets en if, inválido para Actions, e interpolaba respuesta externa en shell. Se mueve el secreto a env, se procesa respuesta como archivo acotado, se omite contenido bruto de logs/alertas y se exige PRODUCTION_MONITOR_ENABLED=true explícito. No se ejecutó el monitor ni se enviaron avisos.

La primera ejecución remota de upgrade aprobó53/54 tests,38 assertions SQL y8 pruebas Python; S07 detectó también dependencia del entorno privado. La configuración de Vitest database expone ahora exclusivamente el origen y anon sintéticos entregados por el runner. No se considera aprobado ese upgrade parcial.

## Cierre de helpers Linux

El segundo CI aprobó54 pruebas de upgrade y9 recorridos privados, pero permaneció abierto tras terminarlos. El wrapper npm de Supabase deja un binario hijo con pipes activos al enviar SIGTERM sólo al wrapper. Edge/Python se inician ahora en grupos propios en POSIX y el runner termina exclusivamente esos grupos al cerrar. Windows conserva taskkill por árbol. El criterio reproducible es que el comando exitoso finalice y CI avance a clean; cancelar el intento bloqueado no se considera aprobación total.

## Cierre actual

Requisitos FR-340–349 aprobados: implementación, pruebas confiables, contratos, commit/PR y CI. Docker local recuperado por el usuario; clean123 y upgrade89→123 aprobados sin skips. Configuración humana/comercial por administrador por decisión expresa; producción pendiente. Evidencia local (referencia histórica excluida de esta distribución), CI (referencia histórica excluida de esta distribución).

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Configuración humana/comercial por administrador del cliente; despliegue, hardware y proveedores reales pendientes por alcance. Commit/PR/CI y ambas instalaciones locales aprobados.
