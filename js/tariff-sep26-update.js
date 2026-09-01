// Actualización de listas Swiss Medical · Septiembre 2026.
// Fuente: "Sep26 Cotizador Individuos Todo el País.xlsx".
// La auditoría previa confirmó que los 1.116 importes utilizables de Directo y
// Obligatorio son exactamente el valor del mes anterior +2,2%, redondeado al peso.
//
// IMPORTANTE:
// - No se utiliza el primer bloque de "valor para solicitud" del Excel.
// - Solo se actualizan los 12 planes presentes en los bloques Voluntarios/Directos
//   y Derivación Directa/Obligatorios.
// - AMBU1, AMBU2 e INTER1 quedan sin cambios porque no están incluidos en esta lista.
(() => {
  const tariffs = window.SWISS_ZONE_TARIFFS;
  if (!tariffs) return;

  const RATE = 1.022;
  const TARGET_PLANS = new Set([
    'S1','SMG02','S2','SPORT S','SMG20','SMG30','SPORT','SMG40','SPORT+','SMG50','SMG60','SMG70'
  ]);
  const ZONES = [
    'AMBA',
    'Buenos Aires Interior / Santa Fe',
    'Córdoba',
    'Patagonia / Salta',
    'Tierra del Fuego',
    'Resto del país'
  ];

  const roundTariff = value => Math.round(Number(value) * RATE);
  let updatedValues = 0;

  function updatePriceMap(map){
    if (!map) return;
    for (const [planName, value] of Object.entries(map)) {
      if (!TARGET_PLANS.has(planName) || !Number.isFinite(Number(value)) || Number(value) <= 0) continue;
      map[planName] = roundTariff(value);
      updatedValues += 1;
    }
  }

  function updateAdultMap(adult){
    if (!adult) return;
    for (const [planName, bands] of Object.entries(adult)) {
      if (!TARGET_PLANS.has(planName) || !bands) continue;
      for (const [band, value] of Object.entries(bands)) {
        if (!Number.isFinite(Number(value)) || Number(value) <= 0) continue;
        bands[band] = roundTariff(value);
        updatedValues += 1;
      }
    }
  }

  for (const zone of ZONES) {
    const zoneTariffs = tariffs[zone];
    if (!zoneTariffs) continue;
    for (const kind of ['direct','obligatory']) {
      const tariff = zoneTariffs[kind];
      if (!tariff) continue;
      updateAdultMap(tariff.adult);
      updatePriceMap(tariff.firstChild);
      updatePriceMap(tariff.additionalChild);
    }
  }

  // Los alias continúan apuntando a las tablas AMBA ya actualizadas.
  window.SWISS_DIRECT_TARIFF = tariffs.AMBA?.direct || window.SWISS_DIRECT_TARIFF;
  window.SWISS_TARIFF = tariffs.AMBA?.obligatory || window.SWISS_TARIFF;

  window.SWISS_SEP26_TARIFF_UPDATE = Object.freeze({
    rate: RATE,
    updatedValues,
    expectedUpdatedValues: 1116,
    targetPlans: [...TARGET_PLANS],
    zones: [...ZONES]
  });
})();
