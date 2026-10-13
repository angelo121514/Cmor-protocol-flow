# Inspección privada de imágenes

El administrador configura la infraestructura de esta instalación. La subida permanece bloqueada (`image_inspection_unavailable`) hasta disponer del servicio privado y firmas vigentes; las imágenes existentes se conservan.

El servicio verifica la firma antivirus del archivo original, decodifica todos los píxeles de PNG/JPEG/WebP, rechaza animación, corrupción y tamaños excesivos, elimina metadatos, vuelve a codificar PNG y analiza nuevamente el resultado. No persiste archivos ni registra contenido, credenciales o enlaces. Límite: 2 MiB, 4096 por dimensión, 16 millones de píxeles, dos operaciones simultáneas y decodificación de ocho segundos. No constituye garantía frente a amenazas desconocidas.

## Instalación del cliente

1. Generar `IMAGE_INSPECTION_SECRET` aleatorio de al menos 32 caracteres exclusivamente en servidor. Ejecutar el Compose de este directorio con ese secreto en el entorno del operador.
2. Publicar el inspector mediante un proxy HTTPS autenticado, con límite de cuerpo de 2 MiB, tiempos de espera y restricción de red a las Edge Functions. El puerto ClamAV nunca se publica. Compose sólo enlaza el inspector a loopback; la configuración TLS y del proxy corresponde a la instalación.
3. Configurar los secretos Edge `IMAGE_INSPECTION_URL=https://<origen-privado>` y `IMAGE_INSPECTION_SECRET` coincidente. Nunca usar variables `VITE_` para ellos.
4. Comprobar `/health`, actualización de firmas y una subida real antes de habilitar el uso. Firmas con más de siete días se rechazan. El administrador mantiene actualizaciones, alertas de disponibilidad y recuperación.

ClamAV requiere al menos 3 GiB; prever memoria adicional para el resto de servicios. Pillow está fijado y sus distribuciones verificadas mediante SHA-256. Python y ClamAV se fijan por digest; actualizar estos pins y revisar dependencias forma parte de la operación de cada cliente.

## Validación local reproducible

Instalar Python 3.12 y `python -m pip install --require-hashes -r services/image-inspector/requirements.txt`. Instalar la imagen ClamAV cuyo digest figura en `scripts/prepare-image-inspection.mjs` y ejecutar `node scripts/prepare-image-inspection.mjs --update`. Este paso descarga únicamente firmas de software. Las suites posteriores usan loopback y proveedores simulados; Freshclam queda desactivado durante las pruebas. El guard de Edge rechaza destinos externos. La red bridge de Docker permite conectividad, por lo que una política de bloqueo de salida a nivel de host corresponde al operador. Las pruebas fallan si falta el motor o las firmas están vencidas.

`python -m unittest discover -s services/image-inspector -p 'test_*.py'` comprueba decodificación, metadatos, corrupción y el veredicto real EICAR en memoria. `npm run test:database` inicia el inspector temporal con un secreto sintético y valida la subida hasta Storage. El ejecutor termina su proceso Python; el contenedor propio se detiene con `docker stop cmor-flow-open-source-image-validation-clamav` al finalizar.

Referencias primarias: [ClamAV Docker](https://docs.clamav.net/manual/Installing/Docker.html), [protocolo INSTREAM](https://docs.clamav.net/manual/Usage/ClamdProtocol.html), [seguridad de Pillow](https://pillow.readthedocs.io/en/stable/handbook/security.html).
