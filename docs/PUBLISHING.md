# Publicar la copia en GitHub

Esta carpeta contiene un repositorio Git nuevo, sin remotos, con un commit inicial de autoría neutra. No copies el `.git`, `.env`, respaldos ni configuración del repositorio original.

El ZIP de entrega contiene solo fuentes y omite `.git`. Si partes de ese ZIP, inicializa Git en la carpeta extraída antes de ejecutar las comprobaciones que consultan archivos versionados:

```sh
git init -b main
git config user.name "CMOR FLOW Contributors"
git config user.email "contributors@example.invalid"
git add .
git commit -m "Initial open-source release (MIT)"
```

Esos datos de autor son neutros. Puedes elegir otra atribución pública; revisa los metadatos antes de subir commits.

1. Revisa el informe privado entregado por separado y resuelve las rotaciones de credenciales reales y las verificaciones pendientes. No adjuntes ese informe a GitHub. Confirma que tienes derechos para distribuir código e identidad visual conservados.
2. Ejecuta `npm run check:public`, `npm run test:docs` y las verificaciones del README. Escanea archivos e historial con Gitleaks:

```sh
gitleaks dir . --redact=100 --no-banner
gitleaks git . --log-opts=--all --redact=100 --no-banner
```

El escaneo de directorio puede señalar credenciales sintéticas en `.local-test/` después de ejecutar la demo. Comprueba que no están versionadas. No excluyas ampliamente los hallazgos para que el escáner pase. Para revisar exactamente el contenido publicable, exporta el commit con `git archive` a una carpeta vacía y escanea esa carpeta.

3. Comprueba `git status --short`, `git log --format=fuller` y `git ls-files`. El correo del commit inicial es un identificador reservado, sin relación con una cuenta privada. Los próximos commits usarán la configuración local de este repositorio; cámbiala si deseas otra atribución pública.
4. Crea en GitHub un repositorio **vacío**, sin README, licencia ni `.gitignore` automáticos. Conserva visibilidad privada si todavía quedan pendientes. Sustituye `YOUR_ORG` por tu usuario u organización:

```sh
git remote add origin https://github.com/YOUR_ORG/CMOR-FLOW.git
git push -u origin main
```

5. Habilita el reporte privado de vulnerabilidades y las alertas de seguridad; revisa permisos de Actions. CI usa servicios locales y el token automático de GitHub, sin credenciales de tu infraestructura. No habilites el monitor hasta configurar sus destinos propios.
6. Antes de cambiar la visibilidad a pública, confirma que instalación limpia/actualización y MFA pasan en CI y que los pendientes del informe privado están cerrados. La entrega local no realiza el push ni cambia la visibilidad de repositorios.

La licencia MIT permite reutilizar el software manteniendo sus avisos. No otorga automáticamente derechos sobre marcas o material de terceros; consulta [avisos de terceros](../THIRD_PARTY_NOTICES.md).
