// Correcciones de auditoría contra las capturas oficiales compartidas para Septiembre 2026.
// data-demo.js conserva la tabla base; este archivo concentra ajustes puntuales verificados.
(() => {
  const tariffs = window.SWISS_ZONE_TARIFFS;
  if (!tariffs) return;

  // AMBA · Directo / Monotributo
  const ambaDirect = tariffs.AMBA?.direct;
  if (ambaDirect?.adult?.SMG40) {
    ambaDirect.adult.SMG40['46_50'] = 564066;
    ambaDirect.adult.SMG40['56_60'] = 953255;
    ambaDirect.adult.SMG40.o61 = 1200535;
  }
  if (ambaDirect?.adult?.SMG70) ambaDirect.adult.SMG70.o61 = 2570537;

  // AMBA · Obligatorio / Desregulado
  const ambaOblig = tariffs.AMBA?.obligatory;
  if (ambaOblig?.adult?.S1) ambaOblig.adult.S1['46_50'] = 212661;
  if (ambaOblig?.additionalChild) ambaOblig.additionalChild.S1 = 83061;

  // Patagonia/Salta y Tierra del Fuego rigen por sus propias tablas aunque coincidan
  // con AMBA. Se clonan para evitar que futuras actualizaciones se propaguen por referencia.
  const clone = value => JSON.parse(JSON.stringify(value));
  if (tariffs['Patagonia / Salta']) {
    tariffs['Patagonia / Salta'] = {
      direct: clone(tariffs['Patagonia / Salta'].direct),
      obligatory: clone(tariffs['Patagonia / Salta'].obligatory)
    };
  }
  if (tariffs['Tierra del Fuego']) {
    tariffs['Tierra del Fuego'] = {
      direct: clone(tariffs['Tierra del Fuego'].direct),
      obligatory: clone(tariffs['Tierra del Fuego'].obligatory)
    };
  }

  // Alias actualizados después de la auditoría.
  window.SWISS_DIRECT_TARIFF = tariffs.AMBA.direct;
  window.SWISS_TARIFF = tariffs.AMBA.obligatory;

  // Helper legado alineado con la regla vigente. El cotizador final usa quote-engine.js.
  window.getSwissDiscount = (age, modality='Directo', zone='AMBA') => {
    if (modality === 'Monotributo') return 25;
    const discounts = [];
    if (Number(age) <= 25) discounts.push(50);
    if (['Nordelta','Tigre','Pilar','Escobar'].includes(zone)) discounts.push(25);
    if (modality === 'Directo') discounts.push(15);
    return Math.max(0, ...discounts);
  };
})();
