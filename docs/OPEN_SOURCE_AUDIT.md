# Saneamiento y validación de la distribución pública

Fecha: 2026-10-13. La distribución inicia un historial Git independiente, con autoría neutra y sin remotos configurados. No se ha publicado en GitHub.

## Alcance de la revisión

Se revisaron 599 archivos versionados del origen, 174 commits alcanzables, 16 referencias disponibles y 1.230 contenidos únicos del historial. Se usaron Gitleaks 8.30.1 y búsquedas contextuales de identidad, contactos, infraestructura, credenciales, rutas locales, SQL y recursos visuales. Se escaneó también el árbol de trabajo original, incluidos archivos ignorados, para excluir información privada. No se consultaron referencias remotas no descargadas, forks, registros de proveedores ni servicios de producción.

El único hallazgo de Gitleaks en ese historial fue un JWT truncado de ejemplo, no utilizable como credencial. La revisión de archivos locales encontró información sensible que quedó fuera de la exportación. Un informe privado separado registra su tratamiento y las rotaciones a cerrar con el operador; no se distribuye en este repositorio. No se afirma ausencia absoluta de secretos.

## Cambios de saneamiento

- Se excluyeron archivos de agentes, configuración de herramientas, notas internas, SQL duplicado, respaldos y evidencia privada de despliegue. La base se instala únicamente con las migraciones canónicas.
- Se retiraron datos personales y contactos propios. Los ejemplos usan identidades ficticias y los contactos de interfaz son configurables. Las políticas y contratos se marcan como plantillas.
- Se eliminaron destinos propios de Supabase, backups y motor tributario, y una actualización de suscripción ligada a una cuenta concreta. Se conservó su número de migración como no-op.
- Se retiraron el monitor antiguo de producción, la subida de respaldos a artefactos y las credenciales demo engañosas de la pantalla de administrador. El monitor restante requiere activación explícita.
- Se parametrizaron CORS y enlaces de servidor. La configuración local admite localhost y 127.0.0.1 en el mismo puerto; producción usa orígenes HTTPS exactos y rechaza comodines.
- Se añadieron preparación local y fixtures exclusivamente sintéticas. El proyecto y los recursos antivirus tienen identificadores distintos de los del origen.
- Se preservó la licencia MIT y se incluyeron avisos y licencias disponibles de 72 dependencias de ejecución. Se excluyeron un recurso de template sin uso y una fotografía remota de portada. Los PNG revisados no contienen texto/EXIF personal y los SVG no contienen metadata de autor.

## Validación ejecutada

Entorno: Windows/PowerShell, Node 24.19.0, Docker Linux 29.7.2, Chrome instalado, Python 3.12 con Pillow y ClamAV real. Se trabajó en una carpeta nueva con los archivos seleccionados para publicación; no se copiaron dependencias ni variables del proyecto original.

| Verificación | Resultado |
|---|---|
| `npm ci` | Instalación desde lockfile aprobada. |
| Lint | Sin errores; dos advertencias heredadas de efectos React. |
| Tipos frontend, Edge y tests | Aprobados. |
| Build | Aprobado con configuración pública sintética. |
| Suite local y cobertura | 37 archivos, 323 pruebas aprobadas; líneas 52,62 %, statements 52,22 %, ramas 47,58 %, funciones 49,87 %. |
| Navegador con servicios simulados | 6 recorridos aprobados; no acredita RLS por sí solo. |
| Instalación limpia | 123 migraciones, configuración local y seed sintético aprobados. |
| SQL/pgTAP | 38 aserciones aprobadas contra PostgreSQL real local. |
| Integración/PostgREST/Edge | 52 pruebas aprobadas. |
| Navegador autenticado | 9 recorridos aprobados, incluidos inscripción TOTP, desafío AAL2, POS, sucursales y facturas. |
| Inspector | 8 pruebas aprobadas, incluidas 3 de ClamAV real; no se usó bypass. |
| Lint SQL | Aprobado con nivel error y fallo ante errores. |
| Actualización desde esquema anterior | Aprobada: baseline de 89 migraciones, actualización a 123, 38 aserciones SQL, 52 pruebas de integración y 9 recorridos autenticados. |
| Auditoría npm | Cero vulnerabilidades reportadas al ejecutar. |
| Fuentes publicables | Gitleaks: cero hallazgos en la exportación revisada. La comprobación adicional del commit inicial se registra en la evidencia privada de entrega. |
| Documentación y guard de publicación | Enlaces locales y 123 versiones de migración verificados; sin archivos privados versionados. |
| Sintaxis de operación | Workflows YAML y scripts Bash aprobados. |

La validación encontró y corrigió un rechazo CORS de la interfaz de facturas cuando el navegador local usa 127.0.0.1. Se repitió completa la suite de integración y navegador autenticado después de corregirlo. Un falso positivo del escáner en una plantilla de variables se resolvió cambiando su formato; no se agregaron exclusiones amplias.

## Límites y publicación

El motor Docker estaba inactivo al comienzo y terminó de arrancar después del primer timeout; las validaciones locales anteriores se ejecutaron una vez operativo. Los workflows están preparados, pero no se ejecutaron en un repositorio GitHub nuevo ni se certificó un despliegue remoto. Los proveedores comerciales se simulan en las pruebas; cada operador debe comprobar sus cuentas reales antes de activar cobros.

No se rotaron secretos externos ni se modificó producción. Antes de publicar, cerrar las acciones del informe privado y confirmar derechos sobre la identidad visual conservada del repositorio de origen; no hay una prueba independiente de autoría de marca. La licencia MIT no reemplaza las condiciones de terceros ni una política legal propia de cada instalación.
