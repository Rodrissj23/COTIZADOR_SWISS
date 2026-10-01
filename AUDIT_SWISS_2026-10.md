# Auditoría Swiss Medical · Octubre 2026

## Fuente

- Archivo oficial recibido: `Oct26 Cotizador Individuos Todo el País.xlsx`.
- Se auditaron los bloques comerciales de **Directos / Voluntarios** y **Derivación Directa / Obligatorios**.
- El primer bloque de **valor para solicitud** no forma parte del motor de cotización y no se importa.

## Alcance importado

- 6 zonas: AMBA; Buenos Aires Interior / Santa Fe; Córdoba; Patagonia / Salta; Tierra del Fuego; Resto del país.
- 2 modalidades tarifarias por zona: Directo y Obligatorio.
- 12 planes presentes en la lista oficial: S1, SMG02, S2, SPORT S, SMG20, SMG30, SPORT, SMG40, SPORT+, SMG50, SMG60 y SMG70.
- Se mantienen sin cambios AMBU1, AMBU2 e INTER1 porque no están incluidos en la lista oficial Oct26.
- Se auditaron tarifas de adultos por banda de edad, primer hijo e hijo adicional.

## Resultado de la auditoría

Se compararon **1.116 importes utilizables** de Octubre 2026 contra los bloques `MES ANTERIOR` del mismo archivo.

**Resultado:** los 1.116 importes de Octubre son exactamente el importe de Septiembre 2026 incrementado en **2,0%**, redondeado al peso.

Regla validada:

```text
Octubre 2026 = redondear(Septiembre 2026 × 1,02)
```

No se detectaron excepciones dentro de los bloques comerciales utilizados por el cotizador.

## Checkpoints contra el Excel Oct26

| Zona | Modalidad | Plan | Banda | Octubre 2026 |
|---|---|---|---|---:|
| AMBA | Directo | S1 | Hasta 35 | 201.285 |
| AMBA | Directo | SMG20 | 36–40 | 423.987 |
| AMBA | Directo | SMG40 | 46–50 | 588.005 |
| AMBA | Directo | SMG70 | Desde 61 | 2.679.631 |
| AMBA | Obligatorio | S1 | 46–50 | 221.687 |
| AMBA | Obligatorio | SMG30 | Hasta 35 | 304.523 |
| Buenos Aires Interior / Santa Fe | Directo | S2 | Hasta 35 | 217.310 |
| Córdoba | Directo | S2 | Hasta 35 | 189.534 |
| Patagonia / Salta | Directo | S2 | Hasta 35 | 252.699 |
| Tierra del Fuego | Obligatorio | S2 | Hasta 35 | 197.677 |
| Resto del país | Directo | S2 | Hasta 35 | 197.104 |

### Hijos · AMBA

| Modalidad | Plan | Primer hijo | Hijo adicional |
|---|---|---:|---:|
| Directo | SMG20 | 298.678 | 214.365 |
| Obligatorio | SMG20 | 220.269 | 159.089 |

## Implementación

La actualización se aplica después del parche Sep26 mediante `js/tariff-oct26-update.js` y modifica exclusivamente los importes de los 12 planes presentes en la lista oficial.

Se preservan sin cambios:

- descuentos y campañas comerciales;
- cálculo de aportes;
- disponibilidad por zona/modalidad;
- reglas de composición familiar;
- AMBU1, AMBU2 e INTER1.

La interfaz, las propuestas y los PDF pasan a identificar el tarifario como **Octubre 2026**.

## QA

Se agregó `tests/tariff-oct26-update.mjs`, que verifica:

- los 1.116 importes contra la regla +2,0%;
- checkpoints exactos del Excel Oct26;
- tarifas de hijos;
- Directo, Obligatorio y Monotributo sobre el motor real;
- preservación de AMBU1, AMBU2 e INTER1.

El workflow de GitHub Actions incluye esta auditoría antes de ejecutar las pruebas de lógica, navegador y PDF.
