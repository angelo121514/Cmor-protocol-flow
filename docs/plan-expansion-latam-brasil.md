> Referencia técnica histórica saneada. Para comenzar, usar las guías de instalación y despliegue del README. Las afirmaciones de validación histórica no certifican esta copia.

# Plan maestro de expansión: Latinoamérica hispana y Brasil

**Producto:** SaaS Suchi / plataforma de operación gastronómica  
**Versión:** 1.0  
**Fecha:** 3 de agosto de 2026  
**Horizonte:** 30 meses desde la aprobación del plan  
**Estado de Chile:** operativo; se mantiene como mercado base y laboratorio de producto.

> Este documento es un plan de negocio y producto. Las definiciones tributarias, societarias, laborales, de privacidad y de facturación electrónica deben ser revisadas y aprobadas por asesores locales antes de operar o comercializar una funcionalidad regulada en cada país.

---

## 1. Decisión estratégica

No se expandirá “a Latinoamérica” como un único mercado. Se expandirá **una jurisdicción fiscal y comercial a la vez**, usando un núcleo regional y módulos locales (“country packs”).

La secuencia recomendada es:

```text
Chile operativo
      │
      ▼
Fase 0: plataforma regional
      │
      ▼
Fase 1: Perú
      │
      ▼
Fase 2: Colombia
      │
      ▼
Fase 3: México
      │
      ▼
Fase 4: Ecuador / Uruguay / Costa Rica (uno por vez)
      │
      ▼
Fase 5: Argentina (solo si hay demanda ancla)
      │
      ▼
Fase 6: Brasil (unidad de proyecto propia)
```

### Principios no negociables

1. **Un país nuevo no empieza con código:** empieza con clientes ancla, asesoría local y una integración fiscal/pagos validada.
2. **No ser proveedor fiscal certificado al inicio.** El producto se conecta con proveedores autorizados locales; solo se evalúa certificación propia cuando el volumen y margen la justifiquen.
3. **No lanzar más de un país en producción a la vez.** Se puede investigar el siguiente país, pero el equipo de implementación se concentra en uno.
4. **El núcleo no conoce impuestos ni bancos concretos.** SII, DIAN, SAT, SUNAT, Transbank, PIX y similares viven en adaptadores por país.
5. **El primer objetivo es operación gastronómica, no contabilidad.** Pedidos, mesas, carta, inventario ligero, cocina, delivery y reportes son el producto base; la facturación fiscal es una capacidad local integrable.
6. **La expansión se detiene si Chile se deteriora.** El mercado base debe conservar SLA, soporte y evolución funcional mientras se internacionaliza.

---

## 2. Meta a 30 meses

Al terminar el horizonte, el objetivo es operar un producto regional con:

- Chile consolidado y rentable.
- Perú, Colombia y México en producción estable.
- Un cuarto mercado hispanohablante validado.
- Brasil en piloto controlado en un único estado, no como lanzamiento nacional.
- Una arquitectura que permita sumar un país sin reescribir POS, pedidos, catálogo, mesas, cocina ni analítica.

### Métricas de resultado

| Dimensión | Meta antes de escalar un país | Meta regional al mes 30 |
|---|---:|---:|
| Restaurantes de pago por país | 30 | 250+ fuera de Chile |
| Cadenas / grupos ancla | 3 | 10+ regionales |
| Activación | primer pedido en menos de 1 día | 80% en menos de 1 día |
| Disponibilidad del POS | 99,5% | 99,9% |
| Éxito de emisión fiscal, si aplica | 99,9% | 99,95% |
| Tiempo de primera respuesta soporte | menos de 30 min hábil | menos de 15 min hábil |
| NPS de restaurantes | mayor a 30 | mayor a 45 |
| Recuperación de CAC | menos de 12 meses | menos de 9 meses |

---

## 3. Fase 0 — Plataforma regional antes de vender fuera

**Duración:** meses 0–2  
**País de operación:** Chile  
**Objetivo:** convertir el producto chileno en una plataforma configurable por país, sin cambiar todavía el foco comercial.

### 3.1 Alcance técnico obligatorio

Crear un `CountryProfile` y un `TenantProfile` configurables por restaurante:

```text
CountryProfile
  countryCode            CL | PE | CO | MX | EC | BR | ...
  locale                 es-CL | es-PE | es-CO | pt-BR | ...
  timezone               America/Santiago | America/Lima | ...
  currencyCode           CLP | PEN | COP | MXN | USD | BRL | ...
  currencyMinorUnits     0 | 2
  phoneRules             E.164 + formato de presentación
  taxProfile             tasas, nombres, inclusiones, redondeos
  identityProfile        RUT | RUC | NIT | RFC | CNPJ | ...
  fiscalProvider         adaptador y credenciales por tenant
  paymentProviders       adaptadores disponibles por país
  legalProfile           términos, privacidad, retención, jurisdicción
```

#### Cambios de producto

- Reemplazar moneda y formato fijo CLP por códigos ISO 4217, precisión decimal y `Intl.NumberFormat` según `locale`.
- Reemplazar un IVA global por líneas de impuesto y reglas de redondeo configurables. Nunca calcular impuestos con una constante mundial.
- Guardar montos en unidades menores o decimal exacto; no usar `float` para dinero.
- Transformar RUT y teléfono chileno en validadores seleccionados por `countryCode`; el teléfono se almacena en E.164.
- Quitar textos de “SII”, “Chile”, “RUT” y tribunales chilenos de las pantallas globales. Moverlos a contenido legal y fiscal por país.
- Crear una interfaz `FiscalDocumentProvider`: cotización, boleta/factura, nota de crédito, anulación, reintento, contingencia y consulta de estado.
- Crear una interfaz `PaymentProvider`: crear cobro, confirmar, reversar, conciliar, reintentar y manejar webhooks idempotentes.
- Separar un comprobante comercial no fiscal de un documento tributario válido. Si falla la integración fiscal, el sistema debe indicar el estado real y permitir contingencia aprobada localmente.
- Añadir una cola de emisión con idempotencia, auditoría, alertas y reintentos. Nunca bloquear la operación de cocina por una latencia externa.
- Convertir políticas de privacidad, retención, consentimiento y solicitudes de titulares en configuraciones por jurisdicción.

### 3.2 Alcance operacional

- Definir un dueño de expansión regional con autoridad de detener un lanzamiento.
- Crear un playbook de alta, capacitación y soporte para restaurantes.
- Implementar soporte multizona horaria y una base de conocimiento por país.
- Definir un proceso de selección y evaluación de proveedores de pagos y facturación.
- Preparar contratos tipo: MSA, DPA, anexo de subencargados, SLA y anexo de tratamiento/retención por país.

### 3.3 Entregables

- Matriz de configuración por tenant y migración de datos chilenos existentes.
- Catálogo de adaptadores fiscales y de pago, aunque inicialmente solo use Chile.
- Pruebas automatizadas para CLP, PEN, COP, MXN, USD y BRL; zona horaria y reglas de redondeo.
- Dashboard de salud de integraciones: éxito, latencia, rechazo, reintento y cola pendiente.
- Lista de textos y reglas todavía hardcodeadas a Chile, con dueño y fecha de migración.

### 3.4 Criterio de salida

No se abre Perú hasta que:

- Ninguna pantalla base dependa obligatoriamente de CLP, RUT, SII o español de Chile.
- Un restaurante de prueba pueda operar con PEN, RUC simulado e IGV configurable.
- Las integraciones estén aisladas detrás de interfaces y los webhooks sean idempotentes.
- La regresión en Chile sea cero en pedidos, pagos y suscripciones.

---

## 4. Fase 1 — Perú: primer país piloto

**Duración:** meses 2–5  
**Objetivo:** demostrar que el modelo comercial y técnico de Chile se replica en un país hispanohablante con una fiscalidad distinta.  
**Ciudad inicial:** Lima.  
**Segmento inicial:** restaurantes independientes y grupos de 2–10 locales.

### 4.1 Por qué Perú primero

- Cercanía operativa y lingüística con Chile.
- Permite validar moneda, RUC, IGV, comprobantes y operación de soporte fuera de Chile sin la complejidad inicial de México o Brasil.
- SUNAT mantiene el Sistema de Emisión Electrónica (SEE) para facturas, boletas y notas; el enfoque debe ser integrar un proveedor apto para el segmento elegido, no improvisar cumplimiento. [SUNAT — SEE](https://orientacion.sunat.gob.pe/1-concepto-y-caracteristicas-del-sistema-de-emision-see-sol)

### 4.2 Trabajo comercial previo al código específico

1. Conseguir 15 entrevistas y al menos 10 cartas de intención de pago.
2. Cerrar 3 clientes diseño: uno de mesa, uno de alto delivery y uno multisucursal.
3. Seleccionar asesor tributario y abogado peruano.
4. Comparar 3 proveedores de facturación/pagos en: sandbox, documentación, SLA, precios, soporte, contingencia y titularidad de datos.
5. Confirmar qué documentos requiere realmente cada tipo de cliente; no prometer una integración que el partner no soporte.

### 4.3 Paquete Perú

- Moneda PEN, redondeo y formatos `es-PE`.
- RUC y dirección fiscal configurables.
- IGV y desgloses tributarios configurados mediante perfil, no en el núcleo.
- Adaptador fiscal con ambientes de prueba, producción, consulta y reintentos.
- Términos, DPA, privacidad, soporte y precios en español peruano neutral.
- Medios de pago escogidos después de la prueba comercial; no replicar automáticamente los contratos chilenos.

### 4.4 Piloto y escalamiento

| Etapa | Clientes | Resultado esperado |
|---|---:|---|
| Alpha | 3 | flujos completos en ambiente real supervisado |
| Beta | 10 | operación diaria y soporte documentado |
| Producción limitada | 30 | onboarding repetible y unit economics medibles |
| Escala | 50+ | canal comercial local o partner validado |

### 4.5 Criterio de salida a Colombia

- 30 restaurantes de pago o 3 cadenas activas.
- 99,9% de documentos fiscales aceptados cuando se usen.
- Menos de 5% de onboarding con intervención de ingeniería.
- CAC recuperable en menos de 12 meses.
- Un responsable local/partner puede resolver soporte de primer nivel.

---

## 5. Fase 2 — Colombia: volumen con aliados regulatorios

**Duración:** meses 5–8  
**Ciudad inicial:** Bogotá; después Medellín.  
**Segmento:** restaurantes y grupos multisucursal que valoren operación centralizada.

### 5.1 Estrategia de entrada

Colombia debe entrar con una **alianza de facturación electrónica**. No se busca ser Proveedor Tecnológico DIAN en la primera etapa: esa condición exige requisitos de sociedad local, patrimonio, seguridad y habilitación. La DIAN permite que un facturador use desarrollo propio, servicio gratuito o proveedor habilitado. [DIAN — cómo facturar](https://factura-electronica.dian.gov.co/como-facturar-1.html)

La propuesta de valor no es “otro facturador”; es un sistema gastronómico que conecta de manera confiable con el proveedor fiscal elegido por el restaurante.

### 5.2 Paquete Colombia

- COP y representación visual apropiada para precios sin decimales frecuentes, manteniendo precisión interna correcta.
- NIT, razón social, sucursales y secuencias documentales según definición del partner/asesor.
- IVA, impuesto al consumo y propina tratados como componentes configurables, no como una tasa fija.
- Flujo de contingencia explícito y trazable: venta, estado fiscal pendiente, reintento y conciliación.
- Integración de pagos local priorizada por los clientes diseño; conciliación diaria y manejo de reversas.
- Capacitación sobre entrega, estados y soporte de documentos electrónicos, sin presentar asesoría tributaria al restaurante.

### 5.3 Plan comercial

- 3 partners de referencia: asociación gastronómica, estudio contable y proveedor fiscal/pagos.
- Oferta de lanzamiento limitada a Bogotá para evitar soporte disperso.
- Caso de estudio de Perú antes de ampliar el canal de ventas.
- Pricing local en COP; no convertir el precio chileno por tipo de cambio sin considerar valor, costos y cobros del partner.

### 5.4 Criterio de salida a México

- 30 clientes de pago o 2 grupos con 10+ locales.
- Partner fiscal con SLA contractual, soporte de incidentes y ambiente de pruebas probado.
- No más de 1% de documentos en cola por más de 30 minutos en horario operativo.
- Margen bruto por cuenta que cubra soporte e integración.

---

## 6. Fase 3 — México: entrada estratégica mediante PAC

**Duración:** meses 8–12  
**Ciudad inicial:** Ciudad de México o Guadalajara, elegida por clientes ancla.  
**Segmento:** grupos de restaurantes de 3–20 locales; evitar al comienzo requerimientos enterprise a medida.

### 6.1 Estrategia de cumplimiento

México es un mercado estratégico, pero no debe ser el primer lugar para buscar autorización propia de certificación. La emisión CFDI se articula con Proveedores Autorizados de Certificación (PAC), y convertirse en uno implica requisitos técnicos, legales, de garantías y validación. [SAT — PAC autorizados](https://wwwmat.sat.gob.mx/aplicacion/30796/proveedor-de-certificacion-de-factura-electronica-) y [SAT — autorización PAC](https://wwwmat.sat.gob.mx/tramites/31454/solicita-autorizacion-para-operar-como-proveedor-de-certificacion)

**Decisión:** integrar un PAC con buena cobertura para restaurantes. Cambiar de PAC debe requerir una nueva configuración, no reescribir el producto.

### 6.2 Paquete México

- MXN, RFC y perfiles fiscales por sucursal.
- Motor de documentos capaz de enviar la información requerida por el PAC y conservar respuesta, UUID/folio y acuses.
- Estados claros: borrador, enviado, certificado, rechazado, cancelación solicitada, cancelado.
- Gestión segura de certificados/credenciales con vault, rotación, acceso mínimo y auditoría.
- Flujos de facturación posterior si el modelo de negocio del restaurante lo requiere; validar alcance exacto con el PAC.
- Integración de pagos seleccionada por disponibilidad, costos, contracargos y calidad de webhooks.
- Soporte y contenido en español mexicano; catálogo de errores comprensible para el personal de restaurante.

### 6.3 Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Complejidad CFDI | PAC como fuente de validación y soporte, pruebas de contrato antes de producción |
| Gestión de certificados | vault, cifrado, rotación y trazabilidad; nunca en frontend |
| Rechazos fiscales | cola idempotente, alertas, soporte y visibilidad por sucursal |
| Alcance desbordado | limitar el primer release a los documentos y segmentos acordados |
| Competencia local | vender operación gastronómica y rapidez de puesta en marcha, no solo factura |

### 6.4 Criterio de salida a la fase 4

- 30 cuentas de pago y 3 referencias públicas o privadas verificables.
- Certificación fiscal estable por 60 días.
- Soporte de segundo nivel acordado con PAC y pagos.
- El modelo de partner genera margen positivo tras costo de documento y soporte.

---

## 7. Fase 4 — Expansión eficiente: Ecuador, Uruguay o Costa Rica

**Duración:** meses 12–16  
**Regla:** elegir **un solo país** con evidencia comercial. Los demás quedan en investigación, no en desarrollo simultáneo.

### 7.1 Método de elección

Puntuar cada país de 1 a 5 antes de comprometer ingeniería:

| Criterio | Peso |
|---|---:|
| 10+ LOIs pagadas o 3 cadenas ancla | 30% |
| Partner fiscal y de pagos disponible | 20% |
| Costo/tiempo legal y societario | 15% |
| Similitud con capacidades ya construidas | 15% |
| CAC, ARPA y margen esperados | 10% |
| Capacidad real de soporte local | 10% |

El país elegido necesita un puntaje mínimo de 3,5/5 y no puede reprobar en partners ni soporte.

### 7.2 Hipótesis por país

**Ecuador:** candidato natural si existe demanda, porque trabaja con USD y el SRI publica requisitos claros: firma electrónica, software y acceso al servicio en línea. La facilidad técnica no sustituye la validación local de documentos y retención. [SRI — facturación electrónica](https://www.sri.gob.ec/facturacion-electronica)

**Uruguay:** mercado menor, pero potencialmente bueno para una operación concentrada y clientes de calidad. Entrar solo con partner comercial/local que reduzca el costo de adquisición.

**Costa Rica:** evaluar si las entrevistas muestran mayor disposición a pagar o un partner superior. No asumir compatibilidad fiscal por compartir idioma.

### 7.3 Entregable de la fase

Un nuevo country pack instalado en menos de 10 semanas, utilizando exactamente el mismo núcleo y las mismas interfaces de Perú, Colombia y México.

---

## 8. Fase 5 — Argentina: lanzamiento condicionado

**Duración:** meses 16–20, solo si se cumplen las condiciones.  
**Condición de inicio:** 3 clientes ancla firmados o un partner con canal verificable.

### 8.1 Por qué no es una prioridad automática

Argentina tiene potencial, pero exige una estrategia más rigurosa de precio, pagos, inflación, cambios de moneda y soporte. La facturación electrónica continúa evolucionando y ARCA mantiene obligaciones y etapas de implementación. [ARCA — factura electrónica](https://www.afip.gob.ar/fe/)

### 8.2 Alcance mínimo

- Precios de suscripción ajustables con política explícita, vigencia y comunicación al cliente.
- Reportes y comparativas que no oculten la inflación ni mezclen ventas nominales con métricas operativas.
- ARS y, si corresponde comercialmente, precios de contrato diferenciados de la moneda de operación del restaurante.
- Partner de pagos con liquidación y conciliación comprobadas.
- Módulo fiscal mediante proveedor/local expert; no perseguir cobertura de todos los regímenes desde el primer día.

### 8.3 Decisión de continuar o detener

Tras 90 días de beta, se continúa solo si la mora, los costos de cobro, el soporte y la volatilidad de precios mantienen un margen bruto objetivo. Si no, se conserva la beta sin escalar.

---

## 9. Fase 6 — Brasil: proyecto separado, no una traducción

**Duración:** meses 20–30  
**Piloto inicial:** un solo estado, recomendado São Paulo tras validación local.  
**Equipo:** líder Brasil, ingeniería de integraciones, producto/diseño pt-BR, partner fiscal, legal/privacidad y soporte local.

### 9.1 Razones para tratar Brasil como unidad propia

- Portugués brasileño, no una versión de español traducida automáticamente.
- BRL, CNPJ, CPF y hábitos de pago propios, especialmente PIX.
- Documentos fiscales para consumidor y variaciones de operación/estado.
- LGPD, contratos y atención de titulares propios. La LGPD distingue controlador y operador y exige definir formalmente responsabilidades de tratamiento. [Gobierno de Brasil — LGPD](https://www.gov.br/gestao/pt-br/acesso-a-informacao/privacidade-e-protecao-de-dados/lgpd-no-mgi-1/contratos/contratos-e-lgpd)
- El marco fiscal está en transición de reforma tributaria; los cronogramas y layouts deben revisarse continuamente. [Receita Federal — cronograma DF-e](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/julho/receita-federal-e-comite-gestor-do-ibs-divulgarao-cronograma-para-emissao-dos-documentos-fiscais-eletronicos-da-reforma-tributaria)

### 9.2 Subfases Brasil

| Subfase | Duración | Resultado |
|---|---:|---|
| Descubrimiento | 8 semanas | 20 entrevistas, 3 clientes ancla, partner fiscal, mapa exacto del estado elegido |
| Fundación | 8 semanas | pt-BR, BRL, CNPJ/CPF, LGPD, PIX y arquitectura fiscal brasileña |
| Integración | 12 semanas | documentos requeridos para el segmento/piloto, sandbox, contingencia y conciliación |
| Piloto | 12 semanas | 5–15 restaurantes en un estado, soporte local en horario comercial |
| Escala controlada | posterior | ampliar ciudades/estados solo después de estabilidad y asesoría específica |

### 9.3 Alcance mínimo del piloto

- POS, pedidos, cocina, mesas y reportes en `pt-BR` de calidad nativa.
- BRL, CNPJ/CPF, dirección y reglas de datos brasileñas.
- PIX y un segundo medio de pago según el perfil de clientes.
- Documento fiscal relevante para venta a consumidor del estado/segmento seleccionado, con partner fiscal validado.
- Aviso de privacidad, DPA, canal de titulares y subprocesadores revisados bajo LGPD.
- Operación limitada geográficamente; no ofrecer “Brasil completo” en el marketing inicial.

### 9.4 Criterio para expandir a otro estado

- 99,95% de éxito de documentos y pagos durante 90 días.
- Soporte en portugués cubriendo el horario prometido.
- 30 cuentas de pago y margen bruto aprobado.
- Revisión fiscal específica del nuevo estado y pruebas de homologación/producción pertinentes.

---

## 10. Plan transversal de partners

### 10.1 Tipos de partner necesarios por país

| Tipo | Función | Decisión requerida |
|---|---|---|
| Fiscal | emisión, validación, contingencia, soporte técnico | contrato, sandbox, SLA, seguridad y precio por documento |
| Pagos | cobro, reversa, webhooks, conciliación | disponibilidad, contracargos, liquidación y costo efectivo |
| Legal/tributario | contratos, privacidad, impuestos y entidad local | opinión escrita antes de producción |
| Comercial | leads, distribución, onboarding | metas, comisión, ownership de clientes y calidad de soporte |
| Contable | implementación y confianza con restaurantes | formación, referidos y límites de responsabilidad |

### 10.2 Due diligence mínima de una integración

- API y sandbox funcionales.
- SLA, monitoreo y canal de incidentes 24/7 o equivalente al horario de operación prometido.
- Condiciones de datos: titularidad, subprocesadores, región, exportación y retención.
- Política de precios, mínimos, sobregiros y salida del contrato.
- Capacidad de exportar documentos y datos si el partner cambia.
- Plan de contingencia verificable.
- Referencias reales de clientes de restaurantes o retail.

---

## 11. Equipo y gobernanza

### 11.1 Equipo mínimo durante fases 0–3

| Rol | Responsabilidad |
|---|---|
| Responsable de expansión | P&L, prioridades, gates y decisión go/no-go |
| Product manager regional | country packs, investigación y métricas de activación |
| Tech lead de plataforma | arquitectura, integraciones, seguridad y confiabilidad |
| 1–2 ingenieros de producto | localización, POS y flujos operativos |
| 1 ingeniero de integraciones | fiscal, pagos, colas y webhooks |
| Customer success/implementación | pilotos, capacitación y soporte de primer nivel |
| Asesor legal/tributario local | revisión externa por país |

Brasil requiere un pod dedicado; no debe consumir al equipo que mantiene Chile y el resto de Hispanoamérica.

### 11.2 Comité de lanzamiento por país

El comité se reúne semanalmente durante beta y contiene: expansión, producto, tecnología, soporte, comercial, finanzas y asesor local. Sus únicas decisiones formales son:

- continuar;
- corregir antes de ampliar;
- pausar;
- cerrar el piloto.

Toda excepción regulatoria, de seguridad o de SLA debe registrarse con dueño y fecha de vencimiento.

---

## 12. Tablero de control semanal

### Comercial

- Leads calificados, demos, pilotos, LOIs, conversiones y churn.
- CAC por canal, MRR, ARPA, margen bruto y meses de recuperación CAC.
- Referidos de partners y porcentaje de ventas atribuibles a ellos.

### Producto y operación

- Tiempo desde registro hasta primer pedido.
- Pedidos creados, fallidos, anulados y recuperados.
- Uso por módulo: carta, mesas, cocina, delivery, reportes y pagos.
- Incidentes por restaurante y tiempo de resolución.

### Integraciones y cumplimiento

- Tasa de éxito, latencia, reintentos y cola pendiente por proveedor.
- Documentos fiscales aceptados/rechazados y razón de rechazo.
- Webhooks duplicados, fallidos o fuera de orden.
- Solicitudes de privacidad, accesos privilegiados y rotación de credenciales.

### Calidad de expansión

- Número de diferencias de código específico por país: debe tender a country packs, no a bifurcaciones del núcleo.
- Porcentaje de onboarding sin ayuda de ingeniería.
- Tickets de soporte por 100 restaurantes activos.

---

## 13. Presupuesto por país: estructura de decisión

Antes de aprobar cada fase, crear un presupuesto con estas partidas:

1. Asesoría legal, tributaria y societaria.
2. Adaptadores fiscales y certificación/homologación del partner.
3. Adaptadores de pagos, costos de transacción y conciliación.
4. Traducción, localización, diseño y QA.
5. Ventas, viajes, partners y adquisición de los clientes piloto.
6. Soporte local y cobertura horaria.
7. Infraestructura, monitoreo, seguridad y contingencia.
8. Reserva para cambios regulatorios y problemas de integración.

El presupuesto se aprueba si el escenario conservador conserva margen bruto positivo y permite recuperar CAC en menos de 12 meses. Si la única justificación es “el mercado es grande”, no se abre el país.

---

## 14. Lista de verificación para abrir producción en un país

### Mercado

- [ ] 10 LOIs de pago o 3 clientes ancla firmados.
- [ ] Segmento inicial y ciudad definidos.
- [ ] Precio local, costos de partners y margen aprobados.
- [ ] Plan de soporte y onboarding con responsable identificado.

### Legal y privacidad

- [ ] Forma de operar/entidad local validada.
- [ ] Términos, DPA, privacidad y contratos revisados localmente.
- [ ] Retención, exportación y eliminación de datos definidas.
- [ ] Roles de controlador, operador y suboperadores documentados.

### Producto e ingeniería

- [ ] Country profile configurado, probado y sin cambios al núcleo no justificados.
- [ ] Moneda, impuestos, documentos, identificadores y zona horaria probados.
- [ ] Integración fiscal/pagos validada en sandbox y producción limitada.
- [ ] Cola, reintentos, auditoría, métricas y alertas activas.
- [ ] Runbook de fallas y contingencias disponible al soporte.
- [ ] Pruebas de regresión de Chile aprobadas.

### Operación

- [ ] Capacitación de clientes piloto completada.
- [ ] Soporte local/partner con canales y SLA definidos.
- [ ] Proceso de conciliación diaria probado.
- [ ] Plan de rollback, exportación de datos y comunicación de incidentes aprobado.

---

## 15. Primeras acciones: próximos 30 días

1. Nombrar al responsable de expansión regional y definir presupuesto de Fase 0.
2. Crear la auditoría de hardcodes Chile: moneda, impuestos, RUT, SII, teléfonos, pagos, fechas, textos legales y datos de ejemplo.
3. Diseñar el modelo `CountryProfile`, los contratos de integración y el catálogo de adaptadores.
4. Entrevistar 15 restaurantes en Lima y obtener 10 LOIs antes de cerrar integración o construir el pack Perú completo.
5. Identificar tres partners potenciales de fiscalidad/pagos en Perú y ejecutar una prueba de sandbox con los dos finalistas.
6. Contratar revisión legal/tributaria peruana con un alcance escrito.
7. Definir el dashboard de expansión y la reunión semanal de go/no-go.
8. Congelar cualquier promesa comercial de países futuros que no esté respaldada por un partner y alcance definido.

---

## 16. Criterio final de éxito

El plan tiene éxito si cada lanzamiento hace al núcleo más configurable y no más frágil. Un país nuevo debe agregar configuración, contenido, integraciones y conocimiento local; no copiar el producto ni crear una rama permanente del código.

La prioridad correcta es: **validar demanda pagada → asegurar partners y cumplimiento → construir el country pack → piloto limitado → escalar solo con métricas saludables**.
