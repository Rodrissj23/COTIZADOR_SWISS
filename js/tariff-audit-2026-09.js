// Correcciones de auditoría contra las capturas oficiales compartidas para Septiembre 2026.
// Se mantiene data-demo.js como base y este archivo concentra ajustes puntuales verificables.
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

  // Patagonia/Salta y Tierra del Fuego pueden coincidir en importes con otras regiones,
  // pero comercialmente rigen por su propia tabla. Clonamos profundamente para evitar
  // que una actualización futura de una región modifique otra por referencia compartida.
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
})();
