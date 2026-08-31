(() => {
  const DESREGULADO_VALUE = 'Relación de dependencia';
  const form = document.querySelector('#quoteForm');
  const wrap = document.querySelector('#receiptContributionWrap');
  const input = document.querySelector('#receiptContribution');
  const choices = [...document.querySelectorAll('#modalityChoices .choice')];

  if (!form || !wrap || !input || !choices.length) return;

  const helper = wrap.querySelector('.field-help');
  if (helper) helper.textContent = 'Ingresá el aporte que figura en el recibo. El sistema calcula automáticamente el aporte computable.';

  function selectedModality(){
    return document.querySelector('input[name="modality"]:checked')?.value || 'Directo';
  }

  function refreshReceiptField(){
    const obligatorio = selectedModality() === DESREGULADO_VALUE;
    wrap.hidden = !obligatorio;
    input.disabled = !obligatorio;
    input.required = obligatorio;

    if (obligatorio) {
      input.removeAttribute('disabled');
      input.setAttribute('aria-disabled','false');
    } else {
      input.setAttribute('aria-disabled','true');
    }

    if (typeof updateCommercialFields === 'function') updateCommercialFields();
    if (typeof syncChoiceState === 'function') syncChoiceState();
  }

  choices.forEach(choice => {
    choice.addEventListener('click', () => {
      const radio = choice.querySelector('input[name="modality"]');
      if (radio) radio.checked = true;
      refreshReceiptField();
      if (typeof syncCase === 'function') syncCase();
      requestAnimationFrame(() => {
        refreshReceiptField();
        if (selectedModality() === DESREGULADO_VALUE) input.focus({preventScroll:true});
      });
    });
  });

  form.addEventListener('change', event => {
    if (event.target.matches('input[name="modality"]')) refreshReceiptField();
  });

  form.addEventListener('input', event => {
    if (event.target.matches('input[name="modality"]')) refreshReceiptField();
  });

  refreshReceiptField();
})();
