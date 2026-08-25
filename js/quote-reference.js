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
    const parts=normalized.split('|').map(part=>part.trim()).filter(Boolean);
    return parts.length?parts:[text];
  }

  function technicalRows(planName){
    const benefit=window.SWISS_PLAN_BENEFITS?.[planName];
    const highlights=benefit?.highlights || ['Consultar documentación oficial vigente del plan.'];
    const rows=[];
    highlights.forEach(item=>{
      const title=classifyHighlight(item);
      const parts=explodeHighlight(item);
      const existing=rows.find(row=>row.title===title);
      if(existing) existing.items.push(...parts); else rows.push({title,items:parts});
    });
    return rows;
  }

  function splitThree(rows){
    const flat=[];
    rows.forEach(row=>row.items.forEach(item=>flat.push({title:row.title,item})));
    const groupSize=Math.max(1,Math.ceil(flat.length/3));
    return [0,1,2].map(groupIndex=>{
      const entries=flat.slice(groupIndex*groupSize,(groupIndex+1)*groupSize);
      const grouped=[];
      entries.forEach(entry=>{
        const existing=grouped.find(row=>row.title===entry.title);
        if(existing) existing.items.push(entry.item); else grouped.push({title:entry.title,items:[entry.item]});
      });
      return grouped;
    });
  }

  function technicalPage(plan,benefit,rows,index){
    const fallback=rows.length?rows:[{title:'Alcance de la Cobertura',items:['Consultar documentación oficial vigente del plan.']}];
    return `<section class="quote-page ref-page ref-technical">
      <div class="ref-tech-head">Plan ${esc(displayPlanName(plan.name))} | ${esc(benefit?.system||'Sistema')} | Línea ${esc(benefit?.line||'Swiss Medical')}</div>
      <div class="ref-tech-table-head"><span>Alcance de la Cobertura</span><span>${esc(benefit?.system||'Sistema')}</span></div>
      <div class="ref-tech-table">
        ${fallback.map(row=>`<section class="ref-tech-group"><h3>${esc(row.title)}</h3>${row.items.map(item=>`<div class="ref-tech-row"><span>${esc(item)}</span><b>${index===2?'Según plan':'SC/ST/SL'}</b></div>`).join('')}</section>`).join('')}
      </div>
      ${index===2?`<div class="ref-tech-notes"><b>Referencias:</b> ST: Sin Tope · SC: Sin Cargo · SL: Sin Límite · CT: Con Tope · CC: Con Cargo · CL: Con Límite.<br>Los topes, cargos, reintegros, exclusiones y condiciones completas se rigen por la documentación oficial vigente de Swiss Medical.</div>`:''}
      <div class="ref-tech-footer">Vigencia: ${esc(benefit?.source||TARIFF_LABEL)}</div>
    </section>`;
  }

  buildQuote = function(){
    if (!state.plan) return;
    const c=state.client,p=state.plan,quote=quoteFor(p);
    if (quote.status!=='ok') return;

    const detailChunks=chunk(quote.members,6);
    const benefit=window.SWISS_PLAN_BENEFITS?.[p.name];
    const techGroups=splitThree(technicalRows(p.name));
    const total=5+detailChunks.length;
    const pages=[];

    pages.push(`<section class="quote-page ref-page ref-cover">
      <div class="ref-pattern"></div>
      <div class="ref-cover-panel">
        <div class="ref-cover-copy"><h1>Hola,<br>¿cómo<br>estás hoy?</h1><h2>Te acercamos tu cotización.</h2></div>
        <div class="ref-cover-logo">${refBrand(true)}</div>
      </div>
    </section>`);

    pages.push(`<section class="quote-page ref-page ref-network">
      <div class="ref-network-band"></div>
      <div class="ref-network-shell">
        <div class="ref-network-logo">${refBrand(false)}</div>
        <h2>Hoy contamos con:</h2>
        <div class="ref-stat ref-stat--wide"><strong>+100mil</strong><span>profesionales<br>de la salud</span></div>
        <div class="ref-stat ref-stat--wide"><strong>+4.000</strong><span>clínicas, centros<br>médicos y de<br>diagnóstico</span></div>
        <div class="ref-stat-grid">
          <div class="ref-stat ref-stat--small"><strong>19</strong><span>centros<br>médicos y<br>odontológicos<br>propios</span></div>
          <div class="ref-stat ref-stat--small"><strong>11</strong><span>sanatorios<br>propios</span></div>
        </div>
        <div class="ref-stat-grid ref-stat-grid--bottom">
          <div class="ref-info-card"><b>Guardia ágil</b><span>reservá tu lugar en la guardia y esperá tu turno desde donde quieras</span></div>
          <div class="ref-info-card ref-info-card--switty"><b>Switty</b><span>tus trámites y consultas simple y rápido por Whatsapp</span><div class="ref-switty"><i></i><em></em></div></div>
        </div>
      </div>
    </section>`);

    detailChunks.forEach((members,index)=>{
      const first=index===0;
      const isLast=index===detailChunks.length-1;
      const familyText=members.map(m=>`${m.role} ${m.age}`).join(' · ');
      pages.push(`<section class="quote-page ref-page ref-summary">
        <div class="ref-pattern"></div>
        <div class="ref-summary-panel">
          <div class="ref-summary-title">| Nueva <b>COTIZACIÓN</b></div>
          <div class="ref-summary-plan"><span>PLAN</span><strong>${esc(displayPlanName(p.name))}</strong></div>
          <div class="ref-summary-table">
            <div class="ref-summary-pair"><b>Grupo familiar</b><span>${esc(familyText || compositionLabel(c))}</span></div>
            ${first?`<div class="ref-summary-pair"><b>Zona</b><span>${esc(c.zone)}</span></div>`:''}
            ${first?`<div class="ref-summary-pair"><b>Valor detalle</b><span>${money(quote.listPrice)}</span></div>`:''}
            ${first?`<div class="ref-summary-pair"><b>Fliar a cargo</b><span>${money(familyCharge(quote))}</span></div>`:''}
            ${first?`<div class="ref-summary-pair"><b>Aportes a descontar</b><span>${quote.aporteComputable>0?`- ${money(quote.aporteComputable)}`:moneyOrZero(0)}</span></div>`:''}
            ${first?`<div class="ref-summary-pair"><b>Descuento promocional</b><span>${promoText(quote)}${quote.discount>0?'<small>Bonificación comercial aplicada</small>':''}</span></div>`:''}
            ${first?`<div class="ref-summary-pair"><b>Descuento multiproducto</b><span>${moneyOrZero(0)}</span></div>`:''}
            ${first?`<div class="ref-summary-pair"><b>IVA</b><span>Incluido</span></div>`:''}
            ${isLast?`<div class="ref-summary-total"><b>Total</b><strong>${money(quote.finalPrice)}</strong></div>`:''}
          </div>
          ${isLast?`<p class="ref-summary-note">*Los datos exhibidos en el siguiente reporte son una aproximación de los valores finales y pueden variar por ajustes de precios o dependiendo de la fidelidad de los datos brindados al cotizador.<br>*Tarifario: ${esc(TARIFF_LABEL)} · propuesta válida por ${QUOTE_VALIDITY_HOURS} hs desde su emisión.</p><div class="ref-summary-logo">${refBrand(false)}</div>`:''}
        </div>
      </section>`);
    });

    techGroups.forEach((rows,index)=>pages.push(technicalPage(p,benefit,rows,index)));

    $('#quotePages').innerHTML=pages.join('');
    $('.dialog-toolbar small').textContent=`${total} páginas · formato Swiss Medical`;
  };
})();
