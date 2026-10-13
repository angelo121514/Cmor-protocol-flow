# Seguridad

La rama `main` es el destino de correcciones de esta distribución inicial. No se ofrece un plazo de respuesta garantizado ni soporte para instalaciones privadas anteriores.

Reporta vulnerabilidades mediante **Security → Advisories → Report a vulnerability** del repositorio donde se publique esta copia. El mantenedor debe habilitar primero el reporte privado. Si ese canal no está disponible, pide en un issue únicamente un canal privado, sin publicar detalles técnicos, datos personales ni una prueba explotable.

Incluye en privado la versión, los pasos mínimos con datos ficticios, el impacto y una posible corrección. No envíes credenciales reales. El mantenedor confirmará recepción y coordinará la divulgación con quien reporta.

Para instalaciones propias, protege las claves de servidor, configura MFA, revisa RLS y mantén actualizadas las dependencias. Ante una clave expuesta, revócala o rótala primero, revisa registros y sesiones, y luego elimina sus copias y sanea el historial. `.gitignore` no elimina commits anteriores.

Referencias: [reporte privado en GitHub](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository) y [configuración del proyecto](docs/CONFIGURATION.md).
