# Auditoría Swiss Medical · Septiembre 2026

## Alcance revisado

- 15 planes comerciales.
- Tablas por AMBA, Buenos Aires Interior/Santa Fe, Córdoba, Patagonia/Salta, Resto del país y Tierra del Fuego.
- Tablas Directo/Monotributo y Obligatorio/Desregulado.
- Planes parciales AMBU1, AMBU2 e INTER1.
- Composición individual, pareja, hijos y pareja+hijos.
- Bonificaciones no acumulativas.
- Desregulado con aporte, tope y piso $0.
- Resumen técnico por plan.
- PDF comercial de 5 páginas.

## Correcciones de tarifario detectadas

Las capturas oficiales compartidas se tomaron como fuente de verdad. Se corrigieron diferencias puntuales de transcripción mediante `js/tariff-audit-2026-09.js`, entre ellas valores de SMG40/SMG70 en AMBA Directo y S1 en AMBA Obligatorio.

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

## Desregulado

```text
baseCalculada = redondear(aporteRecibo × 100 ÷ 3)
baseAporte = mínimo(baseCalculada, 4.045.590)
aporteComputable = baseAporte × 9% × 0,85
precioFinal = máximo(0, precioConBonificaciones - aporteComputable)
```

## Fuentes de beneficios

Los resúmenes de `js/benefits.js` se basan en los PDFs oficiales compartidos. S1 y S2 usan la última versión disponible 07/2026; los restantes planes usan 08/2026.

## Pendiente de QA visual final

Queda para una pasada posterior sobre el sitio desplegado:

- desktop en navegador real;
- mobile;
- descarga efectiva del PDF desde producción;
- revisión visual de saltos, textos largos y cantidad alta de integrantes.

Esta etapa no modifica reglas comerciales: es QA de presentación y comportamiento del despliegue.
