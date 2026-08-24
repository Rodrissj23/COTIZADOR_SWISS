# Cotizador Swiss Medical · Grupo Zeroka

Portal comercial para cotizar planes Swiss Medical por zona, modalidad, edad y composición familiar, con detalle de precio de lista, bonificaciones por integrante y valor mensual final.

## Estado

- Diseño desktop y mobile implementado.
- Tarifarios cargados por zona y modalidad según las tablas comerciales compartidas.
- Cálculo individual por integrante: titular, pareja e hijos.
- Bonificaciones aplicadas por persona y sin acumulación: se toma únicamente la mayor que corresponda.
- Nordelta / Tigre configurado como beneficio opcional del 25%, no como localidad.
- Los planes no disponibles para una zona/modalidad se ocultan.
- AMBU1, AMBU2 e INTER1 usan su tabla parcial propia; con más de un hijo se solicita confirmación comercial.
- PDF con valor de lista, bonificaciones y valor final.
- Pendiente: incorporar la tabla de aportes para completar la lógica de Relación de dependencia / Monotributo cuando corresponda.
- Beneficios médicos por plan pendientes de la revisión final de las cartillas.

## Reglas comerciales consolidadas

- Directo y Monotributo comparten tabla base donde el tarifario indica `DIRECTO | MONOTRIBUTO`.
- Relación de dependencia usa la tabla `OBLIGATORIO`.
- Directo: 15%.
- Monotributo: 25%.
- Menor de 25 años: 50%.
- Beneficio Nordelta / Tigre: 25% opcional.
- Si una persona reúne más de una bonificación, se aplica sólo la mayor.
- La bonificación se calcula integrante por integrante y luego se suman los resultados.
- Los hijos se consideran hasta 21 años.
- Primer hijo usa `1er Hijo`; desde el segundo se usa `Hijo Adicional`.
- Tierra del Fuego Monotributo usa la misma base que Directo y aplica el 25% de Monotributo.

## Vista local

Abrir `login.html`. En modo archivo el acceso conduce al portal sin validar credenciales. En producción, Netlify utiliza `AUTH_USER`, `AUTH_PASSWORD` y `SESSION_SECRET`.
