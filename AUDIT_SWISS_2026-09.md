# Auditoría Swiss Medical · Septiembre 2026

## Alcance revisado

- 15 planes comerciales.
- Tablas por AMBA, Buenos Aires Interior/Santa Fe, Córdoba, Patagonia/Salta, Resto del país y Tierra del Fuego.
- Tablas Directo/Monotributo y Obligatorio/Desregulado según disponibilidad informada.
- Planes parciales AMBU1, AMBU2 e INTER1.
- Composición individual, pareja, hijos y pareja+hijos.
- Compatibilidad familiar de campañas por integrante y excepción no combinable de Monotributo.
- Campañas comerciales vigentes por 12 meses y sus requisitos documentales.
- Desregulado con aporte, tope y piso $0.
- PDF comercial con paginación dinámica para grupos grandes.
- Alcances oficiales completos: 15/15 planes con PDF asociado y validación automática de firma `%PDF`.

## Correcciones de tarifario detectadas

Las capturas oficiales compartidas se tomaron como fuente de verdad. Se corrigieron diferencias puntuales de transcripción mediante `js/tariff-audit-2026-09.js`, entre ellas valores de SMG40/SMG70 en AMBA Directo, S1 en AMBA Obligatorio y la tarifa de Hijo Adicional de S1 Obligatorio AMBA.

Patagonia/Salta y Tierra del Fuego se mantienen como tablas independientes aunque determinados importes coincidan con otras regiones.

## Casos de borde que debe respetar el sistema

1. Edad 25: aplica 50% si corresponde por edad.
2. Edad 26: deja de aplicar el 50% por edad.
3. Directo familiar: adultos 15% y menores de 26 años 50%.
4. Monotributo familiar: todos los integrantes reciben 25%, incluidos los menores; no se combina con el 50% por edad.
5. Desregulado: no agrega bonificación automática.
6. Desregulado con aporte: aporte computable se resta después de bonificaciones.
7. Desregulado con aporte alto: base máxima $4.045.590.
8. Si el aporte computable supera el precio bonificado, el resultado queda en $0.
9. Campaña Nordelta/Tigre/Pilar/Escobar: adultos 25% y menores de 26 años 50% por 12 meses; disponible únicamente para AMBA.
10. Hijo 0–21: puede utilizar `1er Hijo` si todavía no se usó esa tarifa.
11. Segundo hijo 0–21: `Hijo Adicional`.
12. Hijo 22–25: siempre `Hijo Adicional`.
13. Hijo mayor de 25: no se admite dentro de esta composición.
14. Plan parcial sin rango de edad informado: no se muestra.
15. Plan parcial que requiere tarifa de hijo adicional no informada: solicita validación comercial.
16. Cambio de cualquier dato del caso: invalida el plan previamente seleccionado.
17. DNI: opcional en general, pero la campaña territorial requiere DNI y servicio a nombre del titular.
18. PDF: vigencia 72 horas y tarifario Septiembre 2026.
19. PDF: muestra aporte computable, no expone base calculada ni tope interno.
20. Todos los planes se presentan visualmente con el mismo nivel de destaque.
21. Grupos grandes: el detalle económico se reparte en páginas adicionales para no cortar integrantes.
22. Planes parciales: no se ofrecen a titulares o parejas menores de 20 años porque ese rango no aparece en la tabla.
23. Titular y pareja: edad mínima 18 años también se valida dentro del motor, no solo en el formulario.
24. La propuesta comercial no incluye resúmenes de cobertura reconstruidos ni inventados.
25. Los 15 planes tienen alcance oficial asociado y se anexa exactamente al final de la descarga. Si el archivo falta o está dañado, la descarga se bloquea con error explícito en vez de sustituirlo por contenido sintético.
26. El orden final del PDF es: portada → institucional → cotización → detalle familiar si corresponde → alcance oficial exacto.
27. Monotributo: 25% por 12 meses para todo el grupo, incluidos los menores, y requiere formularios 184 y 152 de ARCA.
28. Directo: adultos 15% y menores hasta 25 años y 11 meses 50% por 12 meses.
29. Campaña territorial: adultos 25% y menores hasta 25 años y 11 meses 50% por 12 meses.

## Desregulado

```text
baseCalculada = aporteRecibo × 100 ÷ 3
baseAporte = mínimo(baseCalculada, 4.045.590)
aporteComputable = redondear_a_centavos(baseAporte × 9% × 0,85)
precioFinal = máximo(0, precioConBonificaciones - aporteComputable)
```

La base calculada no se redondea entre pasos. Por ejemplo, con un aporte de recibo de $20.000, el aporte computable es exactamente $51.000.

## Fuentes de beneficios y alcances

`js/benefits.js` conserva metadatos comerciales internos basados en los documentos compartidos, pero esos textos no se incorporan como reemplazo de la documentación médica oficial en la propuesta descargada.

El set binario de alcances quedó completo en `assets/coverage/`: 15/15 PDFs originales esperados. No se debe cambiar artificialmente la vigencia interna de un documento al renombrar el archivo.

S1 y S2 usan la última documentación oficial disponible 07/2026; los restantes planes usan 08/2026.

## QA automatizado

`tests/qa.mjs` valida sintaxis, estructura de tarifarios, checkpoints contra las capturas, reglas de descuentos, composición familiar, rangos etarios, Desregulado, tope de aportes, piso $0, disponibilidad regional, beneficios, PDF directo y protección del JavaScript de tarifas.

`tests/coverage-assets-qa.mjs` exige exactamente los 15 alcances oficiales esperados y fija tamaño y SHA-256 de cada PDF contra el material fuente entregado.

`tests/intro-assets-qa.mjs` fija tamaño, resolución y SHA-256 del PDF original y de sus dos JPEG internos. También bloquea cualquier regreso al rasterizado A4 o a la inserción de las hojas 1 y 2 mediante `jsPDF`.

`tests/browser-qa.mjs` valida modalidades, familias, importes, aportes, preview, mobile/desktop, ausencia de resúmenes de cobertura sintéticos y descarga efectiva con el alcance oficial asociado. Además comprueba que los JPEG originales siguen dentro del PDF final byte a byte, sin recomprimir.

El workflow `.github/workflows/qa.yml` ejecuta esta batería en GitHub Actions sobre cada push y pull request configurado.

## QA visual final

La revisión visual final usa los artefactos generados por CI. Se verifican desktop, mobile, login, modal, portada, institucional, hoja económica y el PDF descargado renderizado a imagen. El merge a `main` queda reservado para el bloque 9, una vez confirmados 1–8 en verde.
