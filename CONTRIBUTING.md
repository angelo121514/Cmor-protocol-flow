# Contribuir a CMOR FLOW

Usa la [guía local](docs/INSTALLATION.md), crea una rama y abre un pull request con el problema, el cambio y cómo lo verificaste. El código nuevo se aporta bajo la licencia MIT del repositorio; conserva los avisos de terceros.

Antes de enviar, ejecuta:

```sh
npm ci
npm run lint
npm run type-check
npm run type-check:edge
npx tsc -p tsconfig.tests.json --pretty false
npm run test:docs
npm run check:public
npm run test:coverage
npm run build
npm run test:e2e
```

Los cambios de SQL, permisos o funciones requieren además `npm run test:database`, con Supabase, Python, antivirus y Chromium locales preparados. CI valida instalación limpia y actualización desde el esquema anterior; no requiere cuentas de producción.

Agrega migraciones nuevas, conserva el orden de versiones y prueba el aislamiento entre restaurantes. Los archivos de la distribución inicial están saneados para instalaciones nuevas; no deben aplicarse como una reparación de instalaciones privadas anteriores.

Usa datos sintéticos y dominios `example.test`. Nunca incluyas `.env`, tokens, respaldos, capturas de clientes, informes privados ni credenciales en comentarios, issues o logs. Ejecuta también Gitleaks antes de publicar. Para vulnerabilidades, sigue [SECURITY.md](SECURITY.md).
