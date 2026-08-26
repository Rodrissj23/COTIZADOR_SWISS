# Cotizador Swiss Medical · Grupo Zeroka

Portal comercial para cotizar planes Swiss Medical por zona, modalidad, edad y composición familiar, con detalle por integrante, bonificaciones, aportes cuando corresponde y descarga directa de propuesta PDF.

## Vigencia comercial

- Tarifario utilizado: **Septiembre 2026**.
- La propuesta emitida tiene una vigencia de **72 horas**.
- Beneficios médicos: se resumen a partir de la última documentación disponible compartida por plan. S1 y S2 utilizan como última fuente disponible la versión 07/2026; el resto utiliza 08/2026.

## Planes

AMBU1, AMBU2, INTER1, S1, S2, SMG02, SPORT S, SPORT, SPORT+, SMG20, SMG30, SMG40, SMG50, SMG60 y SMG70.

Los planes que no tienen precio informado para la zona, modalidad o edad seleccionada se ocultan.

## Reglas comerciales

- Directo: adultos 15% durante 12 meses; menores hasta 25 años y 11 meses 50% durante 12 meses.
- Monotributo: 25% durante 12 meses para todos los integrantes, incluidos los menores. Es la única campaña no combinable, requiere formularios 184 y 152 de ARCA y no descuenta un aporte monetario adicional.
- Campaña territorial: adultos 25% durante 12 meses y menores hasta 25 años y 11 meses 50% durante 12 meses, para Nordelta o residentes de Tigre, Pilar y Escobar, disponible únicamente dentro de AMBA. Requiere DNI y servicio a nombre del titular.
- Directo y la campaña territorial pueden convivir con el 50% de menores dentro de una cotización familiar porque el cálculo se realiza por integrante; los porcentajes no se suman sobre una misma persona.
- Titular y pareja se calculan por separado según su rango etario.
- Se solicita la edad individual de cada hijo.
- Hijos de 0 a 21 años: el primero puede usar tarifa `1er Hijo`; los siguientes usan `Hijo Adicional`.
- Hijos de 22 a 25 años: usan tarifa `Hijo Adicional`.
- AMBU1, AMBU2 e INTER1 siguen exclusivamente los rangos informados en su tabla parcial.
- En planes parciales, si se requiere una tarifa de hijo adicional que la tabla no informa, se solicita validación comercial.
- DNI es opcional.

La condición general de DNI opcional no reemplaza la documentación obligatoria de una campaña: el beneficio territorial exige DNI y servicio a nombre del titular, y Monotributo exige formularios 184 y 152 de ARCA.

## Desregulado

Desregulado usa la tabla `OBLIGATORIO` y no genera una bonificación automática por modalidad.

El vendedor informa un único aporte del recibo del titular. La lógica es:

```text
baseCalculada = redondear(aporteRecibo × 100 ÷ 3)
baseAporte = mínimo(baseCalculada, 4.045.590)
aporteComputable = baseAporte × 9% × 0,85
precioFinal = máximo(0, precioConBonificaciones - aporteComputable)
```

El tope se maneja internamente y no se expone en la propuesta del cliente. El PDF muestra únicamente el aporte computable que se descuenta.

## Zonas

- AMBA
- Buenos Aires Interior / Santa Fe
- Córdoba
- Patagonia / Salta
- Resto del país
- Tierra del Fuego

Cada región se trata como tabla comercial independiente aunque algunos importes coincidan.

## PDF

La propuesta se descarga directamente con el nombre:

`Cotizacion Swiss Medical (Nombre del cliente).pdf`

El armado final conserva este orden: las páginas 1 y 2 del PDF original de Swiss Medical, cotización, detalle familiar únicamente cuando corresponde y alcance oficial completo del plan seleccionado. Las dos hojas iniciales se copian directamente con `pdf-lib`; no pasan por `html2canvas` ni se recomprimen.

## Archivos de mantenimiento

- `js/data-demo.js`: base del tarifario por zona y modalidad.
- `js/tariff-audit-2026-09.js`: correcciones auditadas contra las capturas oficiales de Septiembre 2026.
- `js/benefits.js`: resumen comercial de beneficios por plan basado en los PDFs oficiales compartidos.
- `js/app.js`: reglas de cálculo, formulario, composición familiar, Desregulado y PDF.
- `assets/static/swiss-intro-original.pdf`: PDF fuente original; solo sus páginas 1 y 2 se copian al archivo final.
- `assets/static/swiss-intro-page1.jpg` y `swiss-intro-page2.jpg`: imágenes originales extraídas sin recomprimir del PDF fuente, usadas únicamente en el preview.
- `assets/coverage/*.pdf`: los 15 alcances oficiales binarios completos; el QA fija su SHA-256 y tamaño contra los archivos fuente.

Para un cambio mensual de precios, priorizar actualizar el tarifario y dejar intacta la lógica de `app.js` salvo que cambie una regla comercial.

## Acceso

En producción, Netlify utiliza `AUTH_USER`, `AUTH_PASSWORD` y `SESSION_SECRET`. La sesión dura 8 horas.

> Nota de seguridad: si los precios deben ser confidenciales, el repositorio también debe mantenerse privado. El login protege el uso del portal, pero un repositorio público permite inspeccionar el código fuente del tarifario.
