# Auditoría Swiss Medical · Septiembre 2026

## Alcance revisado

- 15 planes comerciales.
- Tablas por AMBA, Buenos Aires Interior/Santa Fe, Córdoba, Patagonia/Salta, Resto del país y Tierra del Fuego.
- Tablas Directo/Monotributo y Obligatorio/Desregulado según disponibilidad informada.
- Planes parciales AMBU1, AMBU2 e INTER1.
- Composición individual, pareja, hijos y pareja+hijos.
- Bonificaciones no acumulativas.
- Desregulado con aporte, tope y piso $0.
- Resumen técnico por plan.
- PDF comercial con paginación dinámica para grupos grandes.

## Correcciones de tarifario detectadas

Las capturas oficiales compartidas se tomaron como fuente de verdad. Se corrigieron diferencias puntuales de transcripción mediante `js/tariff-audit-2026-09.js`, entre ellas valores de SMG40/SMG70 en AMBA Directo, S1 en AMBA Obligatorio y la tarifa de Hijo Adicional de S1 Obligatorio AMBA.

Patagonia/Salta y Tierra del Fuego se mantienen como tablas independientes aunque determinados importes coincidan con otras regiones.

## Casos de borde que debe respetar el sistema

1. Edad 25: aplica 50% si corresponde por edad.
2. Edad 26: deja de aplicar el 50% por edad.
3. Directo + beneficio territorial: se toma la bonificación mayor, no se acumulan.
4. Monotributo + menor de 25: se toma 50%, no 25% + 50%.
5. Desregulado: no agrega bonificación automática.
6. Desregulado con aporte: aporte computable se resta después de bonificaciones.
7. Desregulado con aporte alto: base máxima $4.045.590.
8. Si el aporte computable supera el precio bonificado, el resultado queda en $0.
9. Beneficio Nordelta/Tigre: disponible únicamente para AMBA.
10. Hijo 0–21: puede utilizar `1er Hijo` si todavía no se usó esa tarifa.
11. Segundo hijo 0–21: `Hijo Adicional`.
12. Hijo 22–25: siempre `Hijo Adicional`.
13. Hijo mayor de 25: no se admite dentro de esta composición.
14. Plan parcial sin rango de edad informado: no se muestra.
15. Plan parcial que requiere tarifa de hijo adicional no informada: solicita validación comercial.
16. Cambio de cualquier dato del caso: invalida el plan previamente seleccionado.
17. DNI: opcional, pero si se informa aparece en la propuesta.
18. PDF: vigencia 72 horas y tarifario Septiembre 2026.
19. PDF: muestra aporte computable, no expone base calculada ni tope interno.
20. Todos los planes se presentan visualmente con el mismo nivel de destaque.
21. Grupos grandes: el detalle económico se reparte en páginas adicionales para no cortar integrantes.
22. Planes parciales: no se ofrecen a titulares o parejas menores de 20 años porque ese rango no aparece en la tabla.
23. Titular y pareja: edad mínima 18 años también se valida dentro del motor, no solo en el formulario.
24. Todos los planes conservan un resumen técnico visible dentro de la propuesta, incluso cuando el PDF oficial todavía no está cargado.
25. Si existe el PDF oficial del plan, se anexa además al final de la descarga; si falta, la descarga comercial no se bloquea.

## Desregulado

```text
baseCalculada = aporteRecibo × 100 ÷ 3
baseAporte = mínimo(baseCalculada, 4.045.590)
aporteComputable = redondear_a_centavos(baseAporte × 9% × 0,85)
precioFinal = máximo(0, precioConBonificaciones - aporteComputable)
```

La base calculada no se redondea entre pasos. Por ejemplo, con un aporte de recibo de $20.000, el aporte computable es exactamente $51.000.

## Fuentes de beneficios

Los resúmenes de `js/benefits.js` se basan en los PDFs oficiales compartidos. S1 y S2 usan la última versión disponible 07/2026; los restantes planes usan 08/2026.

El resumen técnico comercial se mantiene dentro de la vista previa y de la propuesta descargada como capa de respaldo. La carga binaria de alcances oficiales puede completarse por etapas sin dejar ningún plan sin información técnica visible.

## QA automatizado

`tests/qa.mjs` valida sintaxis, estructura de tarifarios, checkpoints contra las capturas, reglas de descuentos, composición familiar, rangos etarios, Desregulado, tope de aportes, piso $0, disponibilidad regional, beneficios, PDF directo y protección del JavaScript de tarifas.

`tests/browser-qa.mjs` valida además que los 15 planes con disponibilidad comercial tengan contenido técnico visible en la propuesta, que la institucional use la captura original, que el resumen económico refleje importes exactos y que la descarga siga funcionando aunque falte el alcance oficial binario.

El workflow `.github/workflows/qa.yml` ejecuta esta batería en GitHub Actions sobre cada push y pull request configurado.

## QA visual final

La lógica y las pruebas automatizadas no reemplazan una revisión del sitio desplegado en navegador real. Para el cierre visual se revisan desktop, mobile, login/logout, modal, descarga efectiva del PDF y textos largos.
