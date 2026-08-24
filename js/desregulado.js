// Lógica de Desregulado con aporte informado desde el recibo de sueldo.
// Regla validada contra la planilla Swiss Medical:
// base = aporteRecibo * 100 / 3
// aporteComputable = base * 0.09 * 0.85
// precioFinal = precioConBonificaciones - aporteComputable

(() => {
  const REL_DEP = 'Relación de dependencia';
  const DESREGULADO_LABEL = 'Desregulado';

  const modalityInput = document.querySelector(`input[name="modality"][value="${REL_DEP}"]`);
  if (!modalityInput) return;

  // El valor interno se conserva porque data-demo.js lo usa para seleccionar
  // el tarifario obligatorio/desregulado. Solo cambia la etiqueta visible.
  const choice = modalityInput.closest('.choice');
  const title = choice?.querySelector('b');
  const subtitle = choice?.querySelector('small');
  if (title) title.textContent = DESREGULADO_LABEL;
  if (subtitle) subtitle.textContent = 'Con aporte de recibo';

  const modalityChoices = document.querySelector('#modalityChoices');
  modalityChoices?.insertAdjacentHTML('afterend', `
    <div class="field-grid field-grid--3" id="receiptContributionRow" style="margin-top:16px" hidden>
      <label>Aporte del recibo de sueldo
        <input id="receiptContribution" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Ej. 20000">
      </label>
    </div>
  `);

  const receiptRow = document.querySelector('#receiptContributionRow');
  const receiptInput = document.querySelector('#receiptContribution');

  const isDesregulado = () => document.querySelector('input[name="modality"]:checked')?.value === REL_DEP;

  function syncReceiptContribution(){
    const enabled = isDesregulado();
    if (receiptRow) receiptRow.hidden = !enabled;
    if (receiptInput) receiptInput.required = enabled;

    if (typeof state !== 'undefined' && state.client) {
      state.client.receiptContribution = enabled ? Math.max(0, Number(receiptInput?.value) || 0) : 0;
    }

    // Evita que el resumen lateral muestre el nombre técnico interno.
    const caseMode = document.querySelector('#caseMode');
    if (caseMode && enabled) {
      const suffix = state.client.specialDiscount === 'nordelta_tigre' ? ' · Beneficio Nordelta/Tigre' : '';
      caseMode.textContent = `${DESREGULADO_LABEL} · ${state.client.zone}${suffix}`;
    }
  }

  // app.js reconstruye state.client dentro de syncCase(). Lo envolvemos para
  // restaurar inmediatamente el aporte y evitar que se pierda al enviar el formulario.
  const originalSyncCase = syncCase;
  syncCase = function(){
    originalSyncCase();
    syncReceiptContribution();
  };

  // Desregulado NO agrega ninguna bonificación por sí mismo.
  // Los descuentos siguen exclusivamente la lógica general del cotizador.
  const originalFamilyQuote = familyQuote;
  familyQuote = function(plan){
    const quote = originalFamilyQuote(plan);
    if (quote.status !== 'ok' || state.client.modality !== REL_DEP) return quote;

    const receiptContribution = Math.max(0, Number(state.client.receiptContribution) || 0);
    const baseAporte = receiptContribution * 100 / 3;
    const aporteComputable = baseAporte * 0.09 * 0.85;
    const finalBeforeAportes = quote.finalPrice;
    const finalPrice = Math.max(0, finalBeforeAportes - aporteComputable);

    return {
      ...quote,
      receiptContribution,
      baseAporte,
      aporteComputable,
      finalBeforeAportes,
      finalPrice
    };
  };

  // Mostramos el aporte también en el resumen del plan seleccionado.
  const originalSelectedSummary = selectedSummary;
  selectedSummary = function(quote){
    if (quote.status !== 'ok' || !quote.aporteComputable) return originalSelectedSummary(quote);
    const bonusText = quote.discount > 0 ? `bonificaciones ${money(quote.discount)}` : 'sin bonificación';
    return `Lista ${money(quote.listPrice)} · ${bonusText} · aportes ${money(quote.aporteComputable)}`;
  };

  // En el PDF agregamos una fila separada para que el descuento por aportes
  // no se confunda con las bonificaciones comerciales.
  const originalMemberBreakdown = memberBreakdown;
  memberBreakdown = function(quote){
    const breakdown = originalMemberBreakdown(quote);
    if (quote.status !== 'ok' || !quote.aporteComputable) return breakdown;
    return `${breakdown}<div class="coverage-row"><span><b>Aporte por recibo de sueldo</b><br><small>Aporte informado ${money(quote.receiptContribution)} · base calculada ${money(quote.baseAporte)}</small></span><span>− ${money(quote.aporteComputable)}</span></div>`;
  };

  syncCase();
})();
