> Referencia técnica histórica saneada. Para comenzar, usar las guías de instalación y despliegue del README. Las afirmaciones de validación histórica no certifican esta copia.

# Excepción temporal de dependencias

## GHSA-qwww-vcr4-c8h2 — React Router y React Server Components

Al 6 de agosto de 2026, `npm audit --omit=dev` informa esta alerta alta para
`react-router` y `react-router-dom` 7.18.2. La aplicación usa Vite con
`BrowserRouter`; no utiliza React Server Components ni el adaptador de React
Router para RSC, que es el vector afectado por el aviso.

No existe una versión estable superior publicada por el paquete que elimine la
alerta. La excepción está limitada en `scripts/verify-npm-audit.mjs` a este
único identificador. Cualquier alerta alta o crítica nueva bloquea CI.

Revisar la excepción al actualizar React Router, al incorporar RSC, o antes de
cualquier despliegue mayor. No debe usarse como autorización para ignorar otros
resultados de `npm audit`.
