(() => {
  const refBrand = (white=false) => `
    <div class="ref-brand ${white?'ref-brand--white':''}" aria-label="Swiss Medical">
      <span class="ref-brand-mark"><i></i><i></i><i></i><i></i></span>
      <span class="ref-brand-copy"><strong>SWISS</strong><strong>MEDICAL</strong></span>
    </div>`;

  const moneyOrZero = value => money(Number(value) || 0);

  function familyCharge(quote){
    if (!quote?.members?.length || quote.members.length < 2) return 0;
    return quote.members.slice(1).reduce((sum,member)=>sum + (Number(member.listPrice)||0),0);
  }

  function detailValue(quote){
    return Number(quote?.members?.[0]?.listPrice) || Number(quote?.listPrice) || 0;
  }

  function promoText(quote){
    const percents=[...new Set((quote.members||[]).map(m=>Number(m.percent)||0).filter(Boolean))];
    if (!quote.discount) return moneyOrZero(0);
    if (percents.length===1) return `${percents[0]}% - ${money(quote.discount)}`;
    return `- ${money(quote.discount)}`;
  }

  function classifyHighlight(text){
    const t=text.toLowerCase();
    if (t.includes('consulta')) return 'Consultas';
    if (t.includes('laboratorio') || t.includes('imagen') || t.includes('estudio') || t.includes('práctica')) return 'Estudios y Prácticas de Diagnóstico y Tratamiento';
    if (t.includes('kinesi') || t.includes('fisioterapia') || t.includes('fonoaudi')) return 'Rehabilitación';
    if (t.includes('psicolog') || t.includes('psicodiagn') || t.includes('salud mental')) return 'Salud Mental';
    if (t.includes('internación') || t.includes('terapia intensiva') || t.includes('uco') || t.includes('habitación')) return 'Servicios en Internación';
    if (t.includes('medicamento')) return 'Medicamentos';
    if (t.includes('odontolog')) return 'Odontología';
    if (t.includes('óptica') || t.includes('anteoj')) return 'Óptica';
    if (t.includes('maternidad')) return 'Maternidad';
    return 'Beneficios Adicionales';
  }

  function explodeHighlight(text){
    let normalized=String(text).replace(/\.\s*$/,'');
    normalized=normalized
      .replace(/\s*;\s*/g,'|')
      .replace(/\s+\+\s+/g,'|')
      .replace(/,\s*maternidad,\s*/gi,'|Maternidad|')
      .replace(/,\s*maternidad\s*/gi,'|Maternidad')
      .replace(/,\s*terapia intensiva y UCO/gi,'|Terapia intensiva y UCO')
      .replace(/,\s*seguro de continuidad/gi,'|Seguro de continuidad')
      .replace(/,\s*chequeo médico ejecutivo anual/gi,'|Chequeo médico ejecutivo anual')
      .replace(/,\s*cirugía refractiva/gi,'|Cirugía refractiva')
      .replace(/\s+y cirugía refractiva/gi,'|Cirugía refractiva')
      .replace(/\s+y cirugía estética/gi,'|Cirugía estética')
      .replace(/\s+y dermo-estética/gi,'|Dermo-estética')
      .replace(/\s+y óptica con\s+/gi,'|Óptica con ')
      .replace(/\s+y óptica anual/gi,'|Óptica anual');
    return normalized.split('|').map(part=>part.trim()).filter(Boolean);
  }

  function technicalEntries(planName){
    const benefit=window.SWISS_PLAN_BENEFITS?.[planName];
    const highlights=benefit?.highlights || ['Consultar documentación oficial vigente del plan.'];
    const entries=[];
    highlights.forEach(item=>{
      const title=classifyHighlight(item);
      const parts=explodeHighlight(item);
      (parts.length?parts:[item]).forEach(part=>entries.push({title,item:part}));
    });
    return entries;
  }

  function groupEntries(entries){
    const rows=[];
    entries.forEach(entry=>{
      const existing=rows.find(row=>row.title===entry.title);
      if(existing) existing.items.push(entry.item); else rows.push({title:entry.title,items:[entry.item]});
    });
    return rows;
  }

  function technicalChunks(planName){
    const entries=technicalEntries(planName);
    const maxPerPage=11;
    const pages=[];
    for(let i=0;i<entries.length;i+=maxPerPage) pages.push(groupEntries(entries.slice(i,i+maxPerPage)));
    return pages.length?pages:[[ {title:'Alcance de la Cobertura',items:['Consultar documentación oficial vigente del plan.']} ]];
  }

  function technicalPage(plan,benefit,rows,index,totalTech){
    return `<section class="quote-page ref-page ref-technical">
      <div class="ref-tech-head">Plan ${esc(displayPlanName(plan.name))} | ${esc(benefit?.system||'Sistema')} | Línea ${esc(benefit?.line||'Swiss Medical')}</div>
      <div class="ref-tech-table-head"><span>Alcance de la Cobertura</span><span>${esc(benefit?.system||'Sistema')}</span></div>
      <div class="ref-tech-table">
        ${rows.map(row=>`<section class="ref-tech-group"><h3>${esc(row.title)}</h3>${row.items.map(item=>`<div class="ref-tech-row"><span>${esc(item)}</span><b>Según plan</b></div>`).join('')}</section>`).join('')}
      </div>
      <div class="ref-tech-notes"><b>Referencias:</b> ST: Sin Tope · SC: Sin Cargo · SL: Sin Límite · CT: Con Tope · CC: Con Cargo · CL: Con Límite.<br>Los topes, cargos, reintegros, exclusiones y condiciones completas se rigen por la documentación oficial vigente de Swiss Medical.</div>
      <div class="ref-tech-footer">Vigencia: ${esc(benefit?.source||TARIFF_LABEL)}${totalTech>1?` · ${index+1}/${totalTech}`:''}</div>
    </section>`;
  }

  function familyDetailPage(plan,quote,members,index,total){
    return `<section class="quote-page ref-page ref-family-detail">
      <div class="ref-family-head"><span>Detalle por integrante</span><b>${esc(displayPlanName(plan.name))}</b></div>
      <div class="ref-family-table-head"><span>Integrante</span><span>Valor de lista</span><span>Bonificación</span><span>Valor final</span></div>
      <div class="ref-family-table">
        ${members.map(m=>`<div class="ref-family-row"><span><b>${esc(m.role)}</b><small>${m.age} años${m.tariffRole?` · ${esc(m.tariffRole)}`:''}</small></span><span>${money(m.listPrice)}</span><span>${m.percent?`${m.percent}% · ${esc(m.label)}`:'Sin bonificación'}</span><strong>${money(m.finalPrice)}</strong></div>`).join('')}
      </div>
      ${index===total-1&&quote.aporteComputable>0?`<div class="ref-family-aporte"><span>Aportes computables</span><b>− ${money(quote.aporteComputable)}</b></div>`:''}
      ${index===total-1?`<div class="ref-family-total"><span>Total mensual final</span><strong>${money(quote.finalPrice)}</strong></div>`:''}
      <div class="ref-family-foot">Valores calculados con el tarifario ${esc(TARIFF_LABEL)}.</div>
    </section>`;
  }

  buildQuote = function(){
    if (!state.plan) return;
    const c=state.client,p=state.plan,quote=quoteFor(p);
    if (quote.status!=='ok') return;

    const benefit=window.SWISS_PLAN_BENEFITS?.[p.name];
    const techPages=technicalChunks(p.name);
    const familyPages=quote.members.length>1?chunk(quote.members,7):[];
    const total=3+familyPages.length+techPages.length;
    const pages=[];

    pages.push(`<section class="quote-page ref-page ref-cover">
      <div class="ref-pattern"></div>
      <div class="ref-cover-panel">
        <div class="ref-cover-copy"><h1>Hola,<br>¿cómo<br>estás hoy?</h1><h2>Te acercamos tu cotización.</h2></div>
        <div class="ref-cover-logo">${refBrand(true)}</div>
      </div>
    </section>`);

    pages.push(`<section class="quote-page ref-page ref-network ref-network--image">
      <img src="assets/images/swiss-network-reference.svg" alt="Hoy contamos con · Swiss Medical">
    </section>`);

    const familyText=quote.members.map(m=>`${m.role} ${m.age}`).join(' · ');
    pages.push(`<section class="quote-page ref-page ref-summary">
      <div class="ref-pattern"></div>
      <div class="ref-summary-panel">
        <div class="ref-summary-title"><span>| Nueva</span> <b>COTIZACIÓN</b></div>
        <div class="ref-summary-plan"><span>PLAN</span><strong>${esc(displayPlanName(p.name))}</strong></div>
        <div class="ref-summary-table">
          <div class="ref-summary-pair"><b>Grupo familiar</b><span>${esc(familyText || compositionLabel(c))}</span></div>
          <div class="ref-summary-pair"><b>Zona</b><span>${esc(c.zone)}</span></div>
          <div class="ref-summary-pair"><b>Valor detalle</b><span>${money(detailValue(quote))}</span></div>
          <div class="ref-summary-pair"><b>Fliar a cargo</b><span>${money(familyCharge(quote))}</span></div>
          <div class="ref-summary-pair"><b>Aportes a descontar</b><span>${quote.aporteComputable>0?`- ${money(quote.aporteComputable)}`:moneyOrZero(0)}</span></div>
          <div class="ref-summary-pair ref-summary-pair--promo"><b>Descuento promocional</b><span>${promoText(quote)}${quote.discount>0?'<small>Bonificación comercial aplicada</small>':''}</span></div>
          <div class="ref-summary-pair"><b>Descuento multiproducto</b><span>${moneyOrZero(0)}</span></div>
          <div class="ref-summary-pair"><b>IVA</b><span>Incluido</span></div>
          <div class="ref-summary-total"><b>Total</b><strong>${money(quote.finalPrice)}</strong></div>
        </div>
        <p class="ref-summary-note">*Los datos exhibidos en el siguiente reporte son una aproximación de los valores finales y pueden variar por ajustes de precios o dependiendo de la fidelidad de los datos brindados al cotizador.<br>*Precios correspondientes al tarifario ${esc(TARIFF_LABEL)} · propuesta válida por ${QUOTE_VALIDITY_HOURS} hs.</p>
        <div class="ref-summary-logo">${refBrand(false)}</div>
      </div>
    </section>`);

    familyPages.forEach((members,index)=>pages.push(familyDetailPage(p,quote,members,index,familyPages.length)));
    techPages.forEach((rows,index)=>pages.push(technicalPage(p,benefit,rows,index,techPages.length)));

    $('#quotePages').innerHTML=pages.join('');
    $('.dialog-toolbar small').textContent=`${total} páginas · formato Swiss Medical`;
  };
})();
